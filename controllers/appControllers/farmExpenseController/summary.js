const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const mongoose = require('mongoose');

dayjs.extend(utc);
dayjs.extend(timezone);

// Models
const feedInventoryModel = mongoose.model('feedInventory');
const feedInventoryUsageModel = mongoose.model('feedInventoryUsage');
const cowExpenseModel = mongoose.model('cowExpense');

// Expense Summary Function
const summaryFarmExpense = async (model, req, res) => {
  try {
    const istTimeZone = 'Asia/Kolkata'; // IST Timezone

    // Time Boundaries using startOf
    const startOfWeek = dayjs().tz(istTimeZone).startOf('week').toDate();
    const startOfMonth = dayjs().tz(istTimeZone).startOf('month').toDate();
    const startOfPreviousMonth = dayjs().tz(istTimeZone).subtract(1, "month").startOf("month").toDate();
    const startOfYear = dayjs().tz(istTimeZone).startOf('year').toDate();
    
    // Helper function to aggregate expenses
    const aggregateExpense = async (Model, filter) => {
      return await Model.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$cost" } } }
      ]);
    };

    // Get expenses data: overall, yearly, monthly, and weekly
    const getExpense = async (Model) => {
      const overall = await aggregateExpense(Model, {});
      const yearly = await aggregateExpense(Model, { date: { $gte: startOfYear } });
      const monthly = await aggregateExpense(Model, { date: { $gte: startOfMonth } });
      const weekly = await aggregateExpense(Model, { date: { $gte: startOfWeek } });

      return {
        overall: overall.length ? overall[0].total : 0,
        yearly: yearly.length ? yearly[0].total : 0,
        monthly: monthly.length ? monthly[0].total : 0,
        weekly: weekly.length ? weekly[0].total : 0,
      };
    };

    // Function to calculate average cost per unit for feed inventory
    const getAverageCostPerUnit = async () => {
      const inventory = await feedInventoryModel.aggregate([
        { $match: { date: { $gte: startOfPreviousMonth } } },
        {
          $group: {
            _id: "$feedType",
            totalCost: { $sum: { $multiply: ["$costPerUnit", "$quantity"] } },
            totalQuantity: { $sum: "$quantity" }
          }
        },
        {
          $project: {
            feedType: "$_id",
            avgCostPerUnit: { $cond: [{ $gt: ["$totalQuantity", 0] }, { $divide: ["$totalCost", "$totalQuantity"] }, 0] }
          }
        }
      ]);

      return inventory.reduce((acc, item) => {
        acc[item.feedType] = item.avgCostPerUnit;
        return acc;
      }, {});
    };

// Function to calculate feed inventory usage expense
const calculateFeedInventoryUsageExpense = async () => {
  const avgCostPerUnitMap = await getAverageCostPerUnit();
  const usageData = await feedInventoryUsageModel.aggregate([
    { $match: { date: { $gte: startOfMonth } } },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$date" }, timezone: "Asia/Kolkata" }
          },
          feedType: "$feedType"
        },
        totalUsed: { $sum: "$quantityUsed" }
      }
    },
    {
      $project: {
        _id: 0,
        day: "$_id.day",
        feedType: "$_id.feedType",
        totalUsed: 1
      }
    },
    {
      $sort: { day: 1, feedType: 1 } // Sort by day and feedType to group them properly
    }
  ]);

  // Format the result
  const result = usageData.reduce((acc, item) => {
    const { day, feedType, totalUsed } = item;
    const avgCost = avgCostPerUnitMap[feedType] || 0;
    const cost = totalUsed * avgCost;

    if (!acc[day]) {
      acc[day] = { date: `${day}`, feeds: {}, totalCost: 0 };  // Format the date properly
    }
    acc[day].feeds[feedType] = {
      totalUsed,
      cost
    };
    acc[day].totalCost += cost;

    return acc;
  }, {});

  // Convert the object into an array
  const formattedResult = Object.keys(result).map(key => result[key]);

  // Calculate daily, weekly, and monthly totals by feed type
  const calculateFeedTotal = (feedType, data) => {
    return data.reduce((acc, item) => {
      const feed = item.feeds[feedType];
      if (feed) {
        acc.totalUsed += feed.totalUsed;
        acc.cost += feed.cost;
      }
      return acc;
    }, { totalUsed: 0, cost: 0 });
  };
  console.log("formattedResult", formattedResult)

  const totalToday = formattedResult.filter(item => 
    dayjs(item.date, "MMM DD YYYY").tz(istTimeZone)
      .isSame(dayjs().tz(istTimeZone).startOf('day'), 'day')
  );
  
  const totalThisWeek = formattedResult.filter(item => 
    dayjs(item.date, "MMM DD YYYY").tz(istTimeZone)
      .isSame(dayjs().tz(istTimeZone).startOf('week'), 'week')
  );
  
  const totalThisMonth = formattedResult.filter(item => 
    dayjs(item.date, "MMM DD YYYY").tz(istTimeZone)
      .isSame(dayjs().tz(istTimeZone).startOf('month'), 'month')
  );
  // Calculate feed totals for today, this week, and this month
  const totalSilageToday = calculateFeedTotal('Silage', totalToday);
  const totalTMRFeedToday = calculateFeedTotal('TMR Feed', totalToday);
  const totalPelletFeedToday = calculateFeedTotal('Pellet Feed', totalToday);

  const totalSilageThisWeek = calculateFeedTotal('Silage', totalThisWeek);
  const totalTMRFeedThisWeek = calculateFeedTotal('TMR Feed', totalThisWeek);
  const totalPelletFeedThisWeek = calculateFeedTotal('Pellet Feed', totalThisWeek);

  const totalSilageThisMonth = calculateFeedTotal('Silage', totalThisMonth);
  const totalTMRFeedThisMonth = calculateFeedTotal('TMR Feed', totalThisMonth);
  const totalPelletFeedThisMonth = calculateFeedTotal('Pellet Feed', totalThisMonth);

  // Return the final result with updated totalUsed and cost values by feed type
  return {
      DailyUsageData: formattedResult,
      testtotalToday:totalToday,
      testtotalThisMonth:totalThisMonth,
      TotalToday: {
        Silage: totalSilageToday,
        TMRfeed: totalTMRFeedToday,
        PelletFeed:totalPelletFeedToday,
        totalcost:totalSilageToday.cost + totalTMRFeedToday.cost +totalPelletFeedToday.cost
      },
      TotalThisWeek: {
        Silage: totalSilageThisWeek,
        TMRfeed: totalTMRFeedThisWeek,
        PelletFeed:totalPelletFeedThisWeek,
        totalcost:totalSilageThisWeek.cost + totalTMRFeedThisWeek.cost + totalPelletFeedThisWeek.cost
      },
      TotalThisMonth: {
        Silage: totalSilageThisMonth,
        TMRfeed: totalTMRFeedThisMonth,
        PelletFeed:totalPelletFeedThisMonth,
        totalcost:totalSilageThisMonth.cost + totalTMRFeedThisMonth.cost +totalPelletFeedThisMonth.cost
      }
    
  };
};

    
    

    // Get different expense data
    const cowExpense = await getExpense(cowExpenseModel);
    const feedInventoryExpense = await getExpense(feedInventoryModel);
    const farmExpense = await getExpense(model);

    // Calculate feed usage expense
    const feedInventoryUsageExpense = await calculateFeedInventoryUsageExpense();


    // Calculate total expenses
    const totalExpense = {
      overall: cowExpense.overall + feedInventoryExpense.overall + farmExpense.overall,
      yearly: cowExpense.yearly + feedInventoryExpense.yearly + farmExpense.yearly,
      monthly: cowExpense.monthly + feedInventoryExpense.monthly + farmExpense.monthly,
      weekly: cowExpense.weekly + feedInventoryExpense.weekly + farmExpense.weekly,
    };

    return res.status(200).json({
      success: true,
      result: {
        feedInventoryUsageExpense,
        cowExpense,
        feedInventoryExpense,
        farmExpense,
        totalExpense,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error generating farm expense summary: ' + error.message,
    });
  }
};

module.exports = summaryFarmExpense;
