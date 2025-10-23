// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Reference to COPUS Result
  copus_result_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopusResult',
    required: true
  },
  
  // Faculty Information
  faculty_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employee',  // Changed from 'User' to 'employee' to match the actual model name
    required: true
  },
  faculty_name: {
    type: String,
    required: true
  },
  
  // Observer Information (from the COPUS result)
  observer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employee',  // Changed from 'User' to 'employee' to match the actual model name
    required: true
  },
  observer_name: {
    type: String,
    required: true
  },
  
  // Appointment Details
  appointment_date: {
    type: Date,
    required: true
  },
  appointment_time: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  responded_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ faculty_id: 1, created_at: -1 });
appointmentSchema.index({ observer_id: 1, created_at: -1 });
appointmentSchema.index({ copus_result_id: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);