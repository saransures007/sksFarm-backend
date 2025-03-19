


const mongoose = require('mongoose');

const requestTrackingSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'], // Example request types
    required: true,
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed, // Stores request payload as a flexible object
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
  },
  responseMessage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model('requestTracking', requestTrackingSchema);
