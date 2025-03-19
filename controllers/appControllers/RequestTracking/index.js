const mongoose = require('mongoose');
const createCRUDController = require('../../middlewaresControllers/createCRUDController');



function modelController() {
  const Model = mongoose.model('cow');
  const methods = createCRUDController('cow');

  return methods;
}

module.exports = modelController();
