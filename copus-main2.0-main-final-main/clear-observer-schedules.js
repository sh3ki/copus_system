// Script to clear all observer schedules from the database
const mongoose = require('mongoose');
require('dotenv').config();

const ObserverSchedule = require('./model/observerSchedule');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Delete all observer schedules
        const result = await ObserverSchedule.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} observer schedules`);
        
        console.log('✅ Database cleared successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
