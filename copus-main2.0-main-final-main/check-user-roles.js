// Check user roles in database
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./model/employee');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB\n');
        
        // Get all users with their roles
        const users = await User.find({})
            .select('firstname lastname role employeeId')
            .sort({ role: 1, firstname: 1 });
        
        console.log('=== ALL USERS IN DATABASE ===\n');
        users.forEach(user => {
            console.log(`${user.firstname} ${user.lastname}`);
            console.log(`  Role: "${user.role}"`);
            console.log(`  Employee ID: ${user.employeeId}`);
            console.log('');
        });
        
        console.log('\n=== FACULTY ONLY ===\n');
        const facultyUsers = await User.find({ role: 'Faculty' })
            .select('firstname lastname role employeeId');
        
        console.log(`Found ${facultyUsers.length} faculty members:`);
        facultyUsers.forEach(user => {
            console.log(`- ${user.firstname} ${user.lastname} (${user.employeeId})`);
        });
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
