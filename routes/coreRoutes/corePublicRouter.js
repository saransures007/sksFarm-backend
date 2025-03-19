const express = require('express');
const moment = require('moment');
const router = express.Router();
const path = require('path')
const mongoose = require('mongoose');
const RequestTracking = mongoose.model('requestTracking');
const TotalMilkProduction = mongoose.model('totalMilkProduction');
// Without middleware
// New Automation API Routes

// ✅ New Automation API Route (Fixes await issue)
router.route('/automation/run/createTotalMilkProduction').post(async function (req, res) {
  try {
    // const { entryDate, totalMilk, avgSnf, avgFat, ratePerLiter, addedBy } = req.body.message;

    console.log("Received request:", req.body.message);
    const regex = /(\d{2}-\d{2}-\d{4})\/([EM]) Qty\(Ltrs\):([\d.]+) Fat%:([\d.]+) Snf%:([\d.]+) Rate:([\d.]+)\/Lt/;
    const match = req.body.message.match(regex);

    const requestEntry = new RequestTracking({
      requestType: 'Requested',
      requestData: req.body.message,
      status: 'CREATING',
      responseMessage: 'req success',
      lastUpdated: Date.now(),
    });

    await requestEntry.save();
    
    if (!match) {
       requestEntry = new RequestTracking({
        requestType: 'CREATE',
        requestData: match,
        status: 'INVALID FORMAT',
        responseMessage: 'failed run test',
        lastUpdated: Date.now(),
      });
  
      await requestEntry.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid message format.',
      });
    }


     requestEntry = new RequestTracking({
      requestType: 'MATCH',
      requestData: match,
      status: 'MATCH FORMAT',
      responseMessage: ' running',
      lastUpdated: Date.now(),
    });

    await requestEntry.save();
    console.log("match", match)

    // Parse extracted data
    const [ data,date, session, totalMilk, avgFat, avgSnf, ratePerLiter] = match;
  // Determine the correct time based on session
      const time = session === 'E' ? '15:00:00' : '05:00:00';
      console.log("date",date);
      console.log(time);
      // Format entryDate in ISO format
      const entryDate = moment(`${date} ${time}`, 'DD-MM-YYYY HH:mm:ss').toISOString();
      console.log(entryDate);
    console.log(entryDate,session, totalMilk, avgFat, avgSnf, ratePerLiter);
    // ✅ Validate required fields
    if (!entryDate || !totalMilk || !avgSnf || !avgFat || !ratePerLiter ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }


    // ✅ Check if an entry already exists for the same date and time
    const existingEntry = await TotalMilkProduction.findOne({ entryDate });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'An entry already exists for the given date and time.',
      });
    }

    // ✅ Create and Save Entry
    const newEntry = new TotalMilkProduction({
      entryDate,
      totalMilk,
      avgSnf,
      avgFat,
      ratePerLiter,
      addedBy:"automation",
      lastUpdated: Date.now(),
    });

    // Save request data in the database
     requestEntry = new RequestTracking({
      requestType: 'CREATE',
      requestData: {
        entryDate,
        totalMilk,
        avgSnf,
        avgFat,
        ratePerLiter,
        addedBy:"automation",
        lastUpdated: Date.now(),
      },
      status: 'SUCCESS',
      responseMessage: 'Successfully run test',
      lastUpdated: Date.now(),
    });

    await requestEntry.save();

    console.log("newEntry", newEntry)

    const result = await newEntry.save();

    return res.status(201).json({
      success: true,
      result,
      message: 'Successfully created Total Milk Production entry.',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating entry: ' + error.message,
    });
  }
});

router.route('/automation/run/test').post(async function (req, res) {
  try {
    const { entryDate, totalMilk, avgSnf, avgFat, ratePerLiter, addedBy } = req.body;
    console.log("Received request:", req.body);

    // Save request data in the database
    const requestEntry = new RequestTracking({
      requestType: 'CREATE',
      requestData: req.body,
      status: 'SUCCESS',
      responseMessage: 'Successfully run test',
      lastUpdated: Date.now(),
    });

    await requestEntry.save();

    return res.status(201).json({
      success: true,
      body:req.body,
      message: 'Successfully  run test',
    });


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating entry: ' + error.message,
    });
  }
});

router.route('/:subPath/:directory/:file').get(function (req, res) {
  try {
    const { subPath, directory, file } = req.params;

    const options = {
      root: path.join(__dirname, `../../public/${subPath}/${directory}`),
    };
    const fileName = file;
    return res.sendFile(fileName, options, function (error) {
      if (error) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'we could not find : ' + file,
        });
      }
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
});

module.exports = router;
