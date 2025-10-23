const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Schedule = require('./model/schedule');

console.log('\n============================================================');
console.log('SCHEDULE FIELD VALIDATION TEST');
console.log('Checking which fields are being saved to database');
console.log('============================================================\n');

const checkFieldPopulation = async () => {
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

        const schedules = await Schedule.find({});
        
        if (schedules.length === 0) {
            console.log('⚠️  No schedules found in database.\n');
            console.log('Please create some schedules through the Admin interface first.\n');
            console.log('Steps:');
            console.log('  1. Start the app: node app.js');
            console.log('  2. Login as admin@admin.com / admin123');
            console.log('  3. Go to Schedule Management');
            console.log('  4. Click "Create Schedule" and fill all fields');
            console.log('  5. Run this test again\n');
            process.exit(0);
        }

        console.log(`Total Schedules: ${schedules.length}\n`);

        // Define all fields we expect to be populated
        const fields = {
            // Required Fields (should be 100%)
            'faculty_employee_id': { category: 'Required', count: 0 },
            'day_of_week': { category: 'Required', count: 0 },
            'start_time': { category: 'Required', count: 0 },
            'end_time': { category: 'Required', count: 0 },
            'status': { category: 'Required', count: 0 },
            
            // Faculty Information (should be 100%)
            'faculty_firstname': { category: 'Faculty Info', count: 0 },
            'faculty_lastname': { category: 'Faculty Info', count: 0 },
            
            // Academic Information (should be ~100% for new schedules)
            'faculty_subject_name': { category: 'Academic', count: 0 },
            'faculty_subject_code': { category: 'Academic', count: 0 },
            'subject_type': { category: 'Academic', count: 0 },  // 🎯 KEY FIELD TO CHECK
            'faculty_department': { category: 'Academic', count: 0 },
            'school_year': { category: 'Academic', count: 0 },
            'semester': { category: 'Academic', count: 0 },
            'faculty_room': { category: 'Academic', count: 0 },
        };

        // Count populated fields
        schedules.forEach(schedule => {
            Object.keys(fields).forEach(field => {
                if (schedule[field] && schedule[field] !== '' && schedule[field] !== null) {
                    fields[field].count++;
                }
            });
        });

        // Display results by category
        const categories = ['Required', 'Faculty Info', 'Academic'];
        
        categories.forEach(category => {
            console.log(`\n${category} Fields:`);
            console.log('─'.repeat(60));
            
            Object.entries(fields).forEach(([field, data]) => {
                if (data.category === category) {
                    const percentage = ((data.count / schedules.length) * 100).toFixed(1);
                    const bar = '█'.repeat(Math.floor(percentage / 5));
                    
                    let status;
                    if (percentage >= 95) {
                        status = '✅';
                    } else if (percentage >= 50) {
                        status = '⚠️';
                    } else {
                        status = '❌';
                    }
                    
                    // Highlight subject_type specially
                    const highlight = field === 'subject_type' ? ' 🎯' : '';
                    
                    console.log(`  ${status} ${field}${highlight}`);
                    console.log(`     ${bar} ${percentage}% (${data.count}/${schedules.length})`);
                }
            });
        });

        // Special focus on subject_type
        console.log('\n============================================================');
        console.log('🎯 CRITICAL FIELD CHECK: subject_type');
        console.log('============================================================\n');

        const subjectTypeField = fields['subject_type'];
        const percentage = ((subjectTypeField.count / schedules.length) * 100).toFixed(1);

        if (percentage === 0) {
            console.log('❌ CRITICAL ISSUE: subject_type is NOT being saved!');
            console.log('');
            console.log('This means the form submission is not sending this field.');
            console.log('');
            console.log('Possible causes:');
            console.log('  1. JavaScript formData.get(\'subject_type\') is missing');
            console.log('  2. HTML input has wrong name attribute');
            console.log('  3. Field is not included in the data object sent to backend');
            console.log('');
            console.log('Expected location: views/Admin/schedule.ejs');
            console.log('  - Line ~978: <select name="subject_type">');
            console.log('  - Line ~1308: subject_type: formData.get(\'subject_type\')');
            console.log('');
        } else if (percentage < 50) {
            console.log('⚠️  WARNING: subject_type is only partially saved');
            console.log('');
            console.log(`Only ${percentage}% of schedules have this field populated.`);
            console.log('');
            console.log('This could mean:');
            console.log('  1. Old schedules don\'t have this field (normal)');
            console.log('  2. Users are not selecting a value (user error)');
            console.log('  3. Field was recently fixed');
            console.log('');
            console.log('Recommendation:');
            console.log('  - Create a NEW schedule through the Admin interface');
            console.log('  - Make sure to SELECT a subject type (Lecture/Laboratory)');
            console.log('  - Run this test again');
            console.log('  - New schedule should have subject_type populated');
            console.log('');
        } else if (percentage < 95) {
            console.log('⚠️  PARTIAL SUCCESS: subject_type is mostly working');
            console.log('');
            console.log(`${percentage}% of schedules have this field populated.`);
            console.log('');
            console.log('This is likely because:');
            console.log('  - Old schedules were created before the fix');
            console.log('  - New schedules SHOULD have this field');
            console.log('');
            console.log('To verify the fix is working:');
            console.log('  1. Create a NEW schedule now');
            console.log('  2. Fill in ALL fields including Subject Type');
            console.log('  3. Run this test again');
            console.log('  4. The new schedule should have subject_type = 100%');
            console.log('');
        } else {
            console.log('✅ EXCELLENT: subject_type is being saved correctly!');
            console.log('');
            console.log(`${percentage}% of schedules have this field populated.`);
            console.log('');
            console.log('The fix is working! All new schedules should have subject_type.');
            console.log('');
        }

        // Show sample schedules
        console.log('============================================================');
        console.log('📋 SAMPLE DATA (First 5 Schedules)');
        console.log('============================================================\n');

        schedules.slice(0, 5).forEach((schedule, index) => {
            console.log(`Schedule ${index + 1}:`);
            console.log(`  Subject: ${schedule.faculty_subject_name || 'N/A'}`);
            console.log(`  Subject Type: ${schedule.subject_type || '❌ MISSING'}`);
            console.log(`  Year: ${schedule.school_year || 'N/A'}`);
            console.log(`  Semester: ${schedule.semester || 'N/A'}`);
            console.log(`  Room: ${schedule.faculty_room || 'N/A'}`);
            console.log(`  Department: ${schedule.faculty_department || 'N/A'}`);
            console.log('');
        });

        // Final summary
        console.log('============================================================');
        console.log('SUMMARY');
        console.log('============================================================\n');

        const criticalIssues = [];
        const warnings = [];
        const success = [];

        Object.entries(fields).forEach(([field, data]) => {
            const percentage = ((data.count / schedules.length) * 100).toFixed(1);
            
            if (data.category === 'Required' && percentage < 100) {
                criticalIssues.push(`${field}: ${percentage}%`);
            } else if (data.category === 'Academic' && percentage < 50) {
                warnings.push(`${field}: ${percentage}%`);
            } else if (percentage >= 95) {
                success.push(`${field}: ${percentage}%`);
            }
        });

        if (criticalIssues.length > 0) {
            console.log('❌ Critical Issues (Required fields < 100%):');
            criticalIssues.forEach(issue => console.log(`  - ${issue}`));
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  Warnings (Academic fields < 50%):');
            warnings.forEach(warning => console.log(`  - ${warning}`));
            console.log('');
        }

        if (success.length > 0) {
            console.log('✅ Fields Working Well (≥ 95%):');
            success.forEach(s => console.log(`  - ${s}`));
            console.log('');
        }

        // Recommendations
        console.log('📌 RECOMMENDATIONS:\n');

        const subjectTypePercentage = ((fields['subject_type'].count / schedules.length) * 100).toFixed(1);
        
        if (subjectTypePercentage === 0) {
            console.log('  1. 🔴 URGENT: Fix subject_type field in views/Admin/schedule.ejs');
            console.log('     Add: subject_type: formData.get(\'subject_type\')');
            console.log('');
        } else if (subjectTypePercentage < 95) {
            console.log('  1. 🟡 Create new schedules to test the subject_type fix');
            console.log('');
        } else {
            console.log('  1. ✅ subject_type is working correctly');
            console.log('');
        }

        if (fields['faculty_firstname'].count < schedules.length) {
            console.log('  2. ⚠️  Some schedules missing faculty names (this is OK if old data)');
            console.log('');
        }

        console.log('  3. 📝 Use the manual testing guide: SCHEDULE_TESTING_GUIDE.md');
        console.log('  4. 🔄 After creating new schedules, run this test again');
        console.log('');

        console.log('============================================================\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkFieldPopulation();
