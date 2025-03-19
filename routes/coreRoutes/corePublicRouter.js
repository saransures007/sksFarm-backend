const express = require('express');

const router = express.Router();
const path = require('path')
const mongoose = require('mongoose');
const RequestTracking = mongoose.model('requestTracking');
// Without middleware
// New Automation API Routes

// ✅ New Automation API Route (Fixes await issue)
router.route('/automation/run/createTotalMilkProduction').post(async function (req, res) {
  try {
    const { entryDate, totalMilk, avgSnf, avgFat, ratePerLiter, addedBy } = req.body;

    console.log("Received request:", req.body);

    // ✅ Validate required fields
    if (!entryDate || !totalMilk || !avgSnf || !avgFat || !ratePerLiter || !addedBy) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    // ✅ Create and Save Entry
    const newEntry = new TotalMilkProduction({
      entryDate,
      totalMilk,
      avgSnf,
      avgFat,
      ratePerLiter,
      addedBy,
      lastUpdated: Date.now(),
    });

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
