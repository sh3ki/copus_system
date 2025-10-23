const mongoose = require('mongoose');
require('dotenv').config();
require('./connection');
const Schedule = require('./model/schedule');
const Employee = require('./model/employee');

const scheduleSeeder = async () => {
  try {
    console.log('🚀 Starting Schedule Seeder...\n');

    // Clear existing schedules
    await Schedule.deleteMany({});
    console.log('🧹 Cleared existing schedules\n');

    // Get all faculty users
    const facultyUsers = await Employee.find({ 
      role: { $in: ['Faculty', 'Observer (ALC)', 'Observer (SLC)'] } 
    });

    console.log(`📋 Found ${facultyUsers.length} faculty/observer users\n`);

    const schedules = [];
    let scheduleCount = 0;

    // Create diverse schedules for different users
    for (let i = 0; i < facultyUsers.length; i++) {
      const user = facultyUsers[i];
      
      // Create 2-3 schedules per user with different configurations
      const numSchedules = Math.floor(Math.random() * 2) + 2; // 2-3 schedules
      
      for (let j = 0; j < numSchedules; j++) {
        scheduleCount++;
        
        // Vary the schedule details
        const subjects = ['Programming 1', 'Data Structures', 'Web Development', 'Database Management', 'Software Engineering', 'Computer Networks'];
        const rooms = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'LAB-A', 'LAB-B', 'TBA'];
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const semesters = ['1st Semester', '2nd Semester', 'Semester 1', 'Semester 2'];
        const statuses = ['pending', 'scheduled', 'approved', 'completed'];
        const modalities = ['RAD', 'FLEX'];
        
        // Random time slots
        const timeSlots = [
          { start: '07:00', end: '10:00' },
          { start: '10:00', end: '13:00' },
          { start: '13:00', end: '16:00' },
          { start: '16:00', end: '19:00' },
          { start: '07:00', end: '09:00' },
          { start: '09:00', end: '11:00' },
          { start: '14:00', end: '16:00' }
        ];
        
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const dayOfWeek = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];
        
        const schedule = {
          schedule_type: 'bulk_faculty',
          faculty_user_id: user._id,
          faculty_employee_id: user.employeeId,
          faculty_firstname: user.firstName,
          faculty_lastname: user.lastName,
          faculty_department: user.department || 'CIT Department',
          faculty_subject_name: subjects[Math.floor(Math.random() * subjects.length)],
          faculty_subject_code: `CS${Math.floor(Math.random() * 900) + 100}`,
          faculty_room: rooms[Math.floor(Math.random() * rooms.length)],
          day_of_week: dayOfWeek,
          start_time: timeSlot.start,
          end_time: timeSlot.end,
          year_level: `${Math.floor(Math.random() * 4) + 1}`,
          school_year: `${2024 + Math.floor(Math.random() * 2)}-${2025 + Math.floor(Math.random() * 2)}`,
          semester: semesters[Math.floor(Math.random() * semesters.length)],
          modality: modalities[Math.floor(Math.random() * modalities.length)],
          copus: 'Copus 1',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          observers: []
        };
        
        schedules.push(schedule);
        
        console.log(`✓ Prepared schedule ${scheduleCount} for ${user.employeeId} (${user.firstName} ${user.lastName})`);
        console.log(`  Subject: ${schedule.faculty_subject_name} (${schedule.faculty_subject_code})`);
        console.log(`  Time: ${schedule.start_time} - ${schedule.end_time}`);
        console.log(`  Day: ${schedule.day_of_week}`);
        console.log(`  Status: ${schedule.status}\n`);
      }
    }

    // Insert all schedules
    const result = await Schedule.insertMany(schedules);
    
    console.log('\n============================================================');
    console.log('🎉 SCHEDULE SEEDING COMPLETED!');
    console.log('============================================================');
    console.log(`✅ Total schedules created: ${result.length}`);
    console.log(`👥 Users with schedules: ${facultyUsers.length}`);
    console.log('============================================================\n');

    // Display summary by status
    const pending = schedules.filter(s => s.status === 'pending').length;
    const scheduled = schedules.filter(s => s.status === 'scheduled').length;
    const approved = schedules.filter(s => s.status === 'approved').length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    
    console.log('📊 Schedule Summary:');
    console.log(`   Pending: ${pending}`);
    console.log(`   Scheduled: ${scheduled}`);
    console.log(`   Approved: ${approved}`);
    console.log(`   Completed: ${completed}`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding schedules:', error);
    process.exit(1);
  }
};

// Wait for MongoDB connection
mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB\n');
  scheduleSeeder();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
