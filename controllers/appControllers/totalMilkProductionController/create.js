const create = async (Model, req, res) => {
  const { entryDate, totalMilk, avgSnf, avgFat, ratePerLiter, addedBy } = req.body;

  console.log("create", req);
  // Ensure required fields are provided
  if (!entryDate || !totalMilk || !avgSnf || !avgFat || !ratePerLiter || !addedBy) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required.',
    });
  }

  try {
    const totalMilkProduction = new Model({
      entryDate,
      totalMilk,
      avgSnf,
      avgFat,
      ratePerLiter,
      addedBy,
      lastUpdated: Date.now(),
    });

    const result = await totalMilkProduction.save();
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
};

module.exports = create;
