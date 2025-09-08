const Event = require("../models/Event");
const Attendee = require("../models/Attendee");

// GET /api/dashboard/stats
// Gathers all key statistics for the admin dashboard.
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Get Total Counts
    const totalEvents = await Event.countDocuments();
    const totalAttendees = await Attendee.countDocuments();

    // 2. Calculate Total Revenue
    // This is a more complex query. We find all attendees who are confirmed or checked-in,
    // look up their corresponding event to get the price, and sum it all up.
    const revenueData = await Attendee.aggregate([
      { $match: { status: { $in: ["confirmed", "checked-in"] } } },
      {
        $lookup: {
          from: "events", // The collection name for the Event model
          localField: "event",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      { $unwind: "$eventDetails" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$eventDetails.price" },
        },
      },
    ]);

    const totalRevenue =
      revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // 3. Get Recent Events for the Table
    // Find the 5 most recently created events.
    const recentEvents = await Event.find().sort({ createdAt: -1 }).limit(5);

    // 4. Placeholder for Average Rating (as we don't have a rating system yet)
    // In a real app, you would calculate this from a 'reviews' collection.
    const averageRating = 4.8;

    // 5. Placeholder for Trend Data
    // A real implementation would compare with data from the previous period (e.g., last month)
    const trendData = {
      events: { value: "12%", isPositive: true },
      attendees: { value: "8%", isPositive: true },
      revenue: { value: "23%", isPositive: true },
      rating: { value: "0.2", isPositive: true },
    };

    // 6. Assemble the response payload
    res.json({
      totalEvents,
      totalAttendees,
      totalRevenue,
      averageRating,
      recentEvents,
      trends: trendData,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
