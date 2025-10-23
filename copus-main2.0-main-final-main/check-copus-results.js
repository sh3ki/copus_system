// check-copus-results.js
// Quick script to check all COPUS results and faculty IDs

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./model/employee');
const CopusResult = require('./model/copusResult');

async function checkResults() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all faculty users
        console.log('👥 ALL FACULTY USERS:');
        const faculties = await User.find({ role: 'Faculty' }).lean();
        faculties.forEach(f => {
            console.log(`   ${f.employeeId}: ${f.firstname} ${f.lastname} - ID: ${f._id}`);
        });

        // Get all COPUS results
        console.log('\n📊 ALL COPUS RESULTS:');
        const results = await CopusResult.find({}).lean();
        
        for (const result of results) {
            const faculty = await User.findById(result.faculty_id);
            console.log(`\n   Result ID: ${result._id}`);
            console.log(`   Faculty ID: ${result.faculty_id}`);
            console.log(`   Faculty Name (in result): ${result.faculty_name}`);
            console.log(`   Faculty (from User collection): ${faculty ? `${faculty.firstname} ${faculty.lastname} (${faculty.employeeId})` : 'NOT FOUND!'}`);
            console.log(`   Observer: ${result.observer_name}`);
            console.log(`   Date: ${new Date(result.observation_date).toLocaleDateString()}`);
            console.log(`   Subject: ${result.subject_name}`);
            console.log(`   Student %: ${result.student_action_percentage}%`);
            console.log(`   Teacher %: ${result.teacher_action_percentage}%`);
            console.log(`   Engagement %: ${result.engagement_level_percentage}%`);
            console.log(`   Overall %: ${result.calculated_overall_percentage}%`);
        }

        // Check Leo Garcia specifically
        console.log('\n\n🔍 CHECKING LEO GARCIA (EMP003):');
        const leoGarcia = await User.findOne({ employeeId: 'EMP003' });
        if (leoGarcia) {
            console.log(`   Current User ID: ${leoGarcia._id}`);
            console.log(`   Name: ${leoGarcia.firstname} ${leoGarcia.lastname}`);
            console.log(`   Employee ID: ${leoGarcia.employeeId}`);
            
            const leoResults = await CopusResult.find({ faculty_id: leoGarcia._id }).lean();
            console.log(`\n   Results found for this ID: ${leoResults.length}`);
            leoResults.forEach((r, i) => {
                console.log(`   ${i + 1}. Date: ${new Date(r.observation_date).toLocaleDateString()}, Subject: ${r.subject_name}, Overall: ${r.calculated_overall_percentage}%`);
            });
        } else {
            console.log('   ❌ Leo Garcia not found!');
        }

        console.log('\n✅ Check complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

checkResults();
