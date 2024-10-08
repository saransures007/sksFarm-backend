const summaryCows = async (Model, req, res) => {
  try {
    const summaryData = await Model.aggregate([
      {
        $group: {
          _id: null,
          totalCows: { $sum: 1 }, // Total number of cows
          currentlyMilking: {
            $sum: { $cond: [{ $eq: ['$isMilking', true] }, 1, 0] } // Count of cows currently milking
          },
          notMilking: {
            $sum: { $cond: [{ $eq: ['$isMilking', false] }, 1, 0] } // Count of cows not milking
          },
        },
      },
    ]);

    if (!summaryData.length) {
      return res.status(404).json({
        success: false,
        message: 'No summary data available.',
      });
    }

    return res.status(200).json({
      success: true,
      result: summaryData[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error generating summary: ' + error.message,
    });
  }
};

module.exports = summaryCows;
