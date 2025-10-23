const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Schedule = require('./model/schedule');

console.log('\n🔍 QUICK CHECK - Last Schedule Created\n');

const checkLast = async () => {
    try {
        await new Promise(resolve => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        const lastSchedule = await Schedule.findOne().sort({ _id: -1 });
        
        if (!lastSchedule) {
            console.log('❌ No schedules found in database\n');
            process.exit(0);
        }

        console.log('Last schedule created:');
        console.log('─'.repeat(60));
        console.log(`ID: ${lastSchedule._id}`);
        console.log(`Faculty: ${lastSchedule.faculty_firstname} ${lastSchedule.faculty_lastname}`);
        console.log(`Employee ID: ${lastSchedule.faculty_employee_id}`);
        console.log('');
        console.log(`📚 Subject Code: ${lastSchedule.faculty_subject_code || '❌ MISSING'}`);
        console.log(`📚 Subject Name: ${lastSchedule.faculty_subject_name || '❌ MISSING'}`);
        console.log(`📖 Subject Type: ${lastSchedule.subject_type || '❌ MISSING'}`);
        console.log('');
        console.log(`📅 School Year: ${lastSchedule.school_year || '❌ MISSING'}`);
        console.log(`📅 Semester: ${lastSchedule.semester || '❌ MISSING'}`);
        console.log('');
        console.log(`🏢 Department: ${lastSchedule.faculty_department || '❌ MISSING'}`);
        console.log(`🚪 Room: ${lastSchedule.faculty_room || 'TBA'}`);
        console.log('');
        console.log(`📆 Day: ${lastSchedule.day_of_week}`);
        console.log(`⏰ Time: ${lastSchedule.start_time} - ${lastSchedule.end_time}`);
        console.log(`📊 Status: ${lastSchedule.status}`);
        console.log('─'.repeat(60));
        
        // Check what's missing
        const missing = [];
        if (!lastSchedule.faculty_subject_code) missing.push('Subject Code');
        if (!lastSchedule.faculty_subject_name) missing.push('Subject Name');
        if (!lastSchedule.subject_type) missing.push('Subject Type');
        if (!lastSchedule.school_year) missing.push('School Year');
        if (!lastSchedule.semester) missing.push('Semester');
        
        if (missing.length > 0) {
            console.log('\n❌ Missing Fields:');
            missing.forEach(field => console.log(`   - ${field}`));
            console.log('\n⚠️  These fields were not saved from the form.\n');
        } else {
            console.log('\n✅ All fields are populated!\n');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkLast();
