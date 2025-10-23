const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Schedule = require('./model/schedule');

console.log('\n============================================================');
console.log('CLEAR ALL SCHEDULES');
console.log('============================================================\n');

const clearSchedules = async () => {
    try {
        // Wait for database connection
        await new Promise(resolve => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        console.log('✅ Connected to MongoDB\n');

        // Count current schedules
        const count = await Schedule.countDocuments();
        console.log(`Current schedules in database: ${count}`);

        if (count === 0) {
            console.log('\n✅ Database is already empty. No schedules to delete.\n');
            process.exit(0);
        }

        // Delete all schedules
        console.log('\n🗑️  Deleting all schedules...');
        const result = await Schedule.deleteMany({});
        
        console.log(`\n✅ Successfully deleted ${result.deletedCount} schedules!`);
        console.log('\n📋 Database is now clean and ready for testing.\n');
        console.log('Next steps:');
        console.log('  1. Start the application: node app.js');
        console.log('  2. Login as admin: admin@admin.com / admin123');
        console.log('  3. Go to Schedule Management');
        console.log('  4. Click "Create Schedule" button');
        console.log('  5. Fill ALL fields:');
        console.log('     - Select Target Role: Faculty');
        console.log('     - Select some faculty members from the list');
        console.log('     - Choose Start Time and End Time');
        console.log('     - Select a Subject from dropdown (e.g., "ITE 260 Computer Programming 1")');
        console.log('     - Select Subject Type (Lecture/Laboratory/Lecture & Laboratory)');
        console.log('     - Enter Year (e.g., "2024-2025")');
        console.log('     - Select Semester');
        console.log('     - Enter Room (e.g., "Room 301")');
        console.log('     - Check at least one day');
        console.log('  6. Click "Create Schedules for All Selected Users"');
        console.log('  7. Run test: node test-field-population.js');
        console.log('\n============================================================\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

clearSchedules();
