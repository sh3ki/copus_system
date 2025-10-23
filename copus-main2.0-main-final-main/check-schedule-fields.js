const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Schedule = require('./model/schedule');

console.log('\n🔍 Checking Schedule Fields\n');

const checkFields = async () => {
    try {
        await new Promise(resolve => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        const schedule = await Schedule.findOne().sort({ _id: -1 });
        
        if (!schedule) {
            console.log('❌ No schedules found\n');
            process.exit(0);
        }

        console.log('Last Schedule Fields:');
        console.log('─'.repeat(60));
        console.log('ID:', schedule._id);
        console.log('\n🔑 Key Fields:');
        console.log('  faculty_user_id:', schedule.faculty_user_id);
        console.log('  faculty_employee_id:', schedule.faculty_employee_id);
        console.log('  faculty_firstname:', schedule.faculty_firstname);
        console.log('  faculty_lastname:', schedule.faculty_lastname);
        console.log('\n📚 Subject Fields:');
        console.log('  faculty_subject_code:', schedule.faculty_subject_code);
        console.log('  faculty_subject_name:', schedule.faculty_subject_name);
        console.log('  subject_type:', schedule.subject_type);
        console.log('\n📅 Academic Fields:');
        console.log('  school_year:', schedule.school_year);
        console.log('  semester:', schedule.semester);
        console.log('  faculty_department:', schedule.faculty_department);
        console.log('  faculty_room:', schedule.faculty_room);
        console.log('\n🎯 Check Results:');
        
        if (schedule.faculty_user_id) {
            console.log('  ✅ faculty_user_id exists (can populate)');
        } else {
            console.log('  ⚠️  faculty_user_id is null (cannot populate)');
        }
        
        if (schedule.faculty_subject_name) {
            console.log('  ✅ faculty_subject_name exists');
        } else {
            console.log('  ❌ faculty_subject_name is missing');
        }
        
        if (schedule.school_year) {
            console.log('  ✅ school_year exists');
        } else {
            console.log('  ❌ school_year is missing');
        }
        
        console.log('\n─'.repeat(60));
        console.log('\n💡 Analysis:');
        
        if (!schedule.faculty_user_id) {
            console.log('❌ Problem: faculty_user_id is null!');
            console.log('   This means the schedule will be filtered out by:');
            console.log('   Schedule.find({ faculty_user_id: { $ne: null } })');
            console.log('\n   Solution: Check why faculty_user_id is not being saved.');
        } else if (!schedule.faculty_subject_name || !schedule.school_year) {
            console.log('❌ Problem: Fields are not being saved!');
            console.log('   Backend is not receiving or saving the data.');
        } else {
            console.log('✅ All fields are saved correctly!');
            console.log('   The issue might be with:');
            console.log('   1. Populate() overwriting fields');
            console.log('   2. Frontend display logic');
            console.log('   3. Cache issue (try Ctrl+F5)');
        }
        
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkFields();
