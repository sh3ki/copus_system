// model/observerSchedule.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const observerScheduleSchema = new Schema({
    // Date for the observation
    observation_date: { 
        type: Date, 
        required: true 
    },
    start_time: { 
        type: String, 
        required: true 
    },
    end_time: { 
        type: String, 
        required: true 
    },
    
    // Faculty information
    faculty_user_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'employee', 
        required: true 
    },
    faculty_name: { 
        type: String, 
        required: true 
    },
    faculty_department: { 
        type: String, 
        required: false 
    },
    
    // Observer information
    observer_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'employee', 
        required: true 
    },
    observer_name: { 
        type: String, 
        required: true 
    },
    
    // Observation details
    copus_type: { 
        type: String, 
        enum: ['Copus 1', 'Copus 2', 'Copus 3'],  // Standardized format: Capital C, lowercase opus
        required: true 
    },
    subject: { 
        type: String, 
        required: true 
    },
    subject_type: { 
        type: String, 
        required: true 
    },
    year_level: { 
        type: String, 
        required: true 
    },
    semester: { 
        type: String, 
        enum: ['1st Semester', '2nd Semester'],
        required: true 
    },
    room: { 
        type: String, 
        required: true 
    },
    
    // Status tracking
    status: {
        type: String,
        enum: [
            'pending',
            'scheduled',
            'in_progress', 
            'completed',
            'cancelled',
            'rescheduled'
        ],
        default: 'pending'
    },
    
    // COPUS Completion Flags
    isCopus1Done: {
        type: Boolean,
        default: false
    },
    isCopus2Done: {
        type: Boolean,
        default: false
    },
    isCopus3Done: {
        type: Boolean,
        default: false
    },
    
    // Additional notes
    notes: { 
        type: String, 
        required: false 
    },

    // Who started the COPUS observation (enforce single starter)
    startedBy: {
        type: Schema.Types.ObjectId,
        ref: 'employee',
        required: false
    },
    startedAt: {
        type: Date,
        required: false
    },
    
    // Notification settings
    sendNotification: { 
        type: Boolean, 
        default: true 
    },
    
    // Reference to related COPUS observation result
    copus_result_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'copusObservation', 
        required: false 
    }
    
}, { timestamps: true });

// Index for better query performance
// Use observation_date for indexes to match the schema
observerScheduleSchema.index({ observation_date: 1, observer_id: 1 });
observerScheduleSchema.index({ faculty_user_id: 1, observation_date: 1 });

module.exports = mongoose.model('ObserverSchedule', observerScheduleSchema);