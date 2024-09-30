const summaryMilkProduction = async (Model, req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // End of today

    const weekStart = new Date();
    weekStart.setDate(todayStart.getDate() - todayStart.getDay()); // Start of this week
    weekStart.setHours(0, 0, 0, 0);

    const morningStart = new Date();
    morningStart.setHours(0, 0, 0, 0); // Start of today morning

    const morningEnd = new Date();
    morningEnd.setHours(11, 59, 59, 999); // End of today morning

    const eveningStart = new Date();
    eveningStart.setHours(12, 0, 0, 0); // Start of today evening

    const eveningEnd = new Date();
    eveningEnd.setHours(23, 59, 59, 999); // End of today evening

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    const dailyMilkProductionPromises = daysOfWeek.map(async (day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyData = await Model.aggregate([
        {
          $match: { entryDate: { $gte: dayStart, $lte: dayEnd } },
        },
        {
          $group: {
            _id: null,
            totalMilk: { $sum: '$liter' },
          },
        },
      ]);

      return dailyData.length > 0 ? dailyData[0].totalMilk : 0;
    });

    const dailyMilkProductionData = await Promise.all(dailyMilkProductionPromises);

    // New logic to calculate daily milk production for this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dailyMilkProductionThisMonthPromises = Array.from({ length: daysInMonth }, (_, day) => {
      const dayStart = new Date(currentYear, currentMonth, day + 1);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentYear, currentMonth, day + 1);
      dayEnd.setHours(23, 59, 59, 999);

      return Model.aggregate([
        {
          $match: { entryDate: { $gte: dayStart, $lte: dayEnd } },
        },
        {
          $group: {
            _id: null,
            totalMilk: { $sum: '$liter' },
          },
        },
      ]).then((dailyData) => (dailyData.length > 0 ? dailyData[0].totalMilk : 0));
    });

    const dailyMilkProductionThisMonthData = await Promise.all(dailyMilkProductionThisMonthPromises);

    const summaryData = await Model.aggregate([
      {
        $facet: {
          totalToday: [
            {
              $match: { entryDate: { $gte: todayStart, $lte: todayEnd } },
            },
            {
              $group: {
                _id: null,
                totalMilk: { $sum: '$liter' },
                totalSilage: { $sum: '$silage' },
              },
            },
          ],
          totalThisWeek: [
            {
              $match: { entryDate: { $gte: weekStart, $lte: todayEnd } },
            },
            {
              $group: {
                _id: null,
                totalMilk: { $sum: '$liter' },
                totalSilage: { $sum: '$silage' },
              },
            },
          ],
          totalMorning: [
            {
              $match: { entryDate: { $gte: morningStart, $lte: morningEnd } },
            },
            {
              $group: {
                _id: null,
                totalMilk: { $sum: '$liter' },
                totalSilage: { $sum: '$silage' },
              },
            },
          ],
          totalEvening: [
            {
              $match: { entryDate: { $gte: eveningStart, $lte: eveningEnd } },
            },
            {
              $group: {
                _id: null,
                totalMilk: { $sum: '$liter' },
                totalSilage: { $sum: '$silage' },
              },
            },
          ],
        },
      },
    ]);

    const expectedMilkPerDay = 80; // Dummy value for expected milk per day
    const expectedSilagePerDay = 200; // Dummy value for expected silage per day  

    const totalToday = summaryData[0].totalToday.length > 0 ? summaryData[0].totalToday[0] : { totalMilk: 0, totalSilage: 0 };
    const totalThisWeek = summaryData[0].totalThisWeek.length > 0 ? summaryData[0].totalThisWeek[0] : { totalMilk: 0, totalSilage: 0 };

    const result = {
      bar:{
      totalToday: {
        ...totalToday,
        expectedMilk: expectedMilkPerDay,
        expectedSilage: expectedSilagePerDay,
      },
      totalThisWeek: {
        ...totalThisWeek,
        expectedMilk: totalThisWeek.totalMilk > 0 ? (expectedMilkPerDay * Math.min(7, new Date().getDay() + 1)) : 0, // Adjusted based on days in the week
        expectedSilage: totalThisWeek.totalSilage > 0 ? (expectedSilagePerDay * Math.min(7, new Date().getDay() + 1)) : 0,
      },
      totalMorning: summaryData[0].totalMorning.length > 0 ? { ...summaryData[0].totalMorning[0], expectedMilk: expectedMilkPerDay / 2, expectedSilage: expectedSilagePerDay / 2 } : { totalMilk: 0, totalSilage: 0, expectedMilk: expectedMilkPerDay / 2, expectedSilage: expectedSilagePerDay / 2 },
      totalEvening: summaryData[0].totalEvening.length > 0 ? { ...summaryData[0].totalEvening[0], expectedMilk: expectedMilkPerDay / 2, expectedSilage: expectedSilagePerDay / 2 } : { totalMilk: 0, totalSilage: 0, expectedMilk: expectedMilkPerDay / 2, expectedSilage: expectedSilagePerDay / 2 },
    },
      chart: {
      dailyMilkProduction: dailyMilkProductionData, // Daily production data for the week
      dailyMilkProductionThisMonth: dailyMilkProductionThisMonthData, // Daily production data for the month
      }
    };

    return res.status(200).json({
      success: true,
      result: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error generating summary: ' + error.message,
    });
  }
};

module.exports = summaryMilkProduction;
