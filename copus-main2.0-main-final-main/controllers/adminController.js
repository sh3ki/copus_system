// controllers/adminController.js

const User = require('../model/employee');
const Schedule = require('../model/schedule');
const FacultySchedule = require('../model/facultySchedule');
const CopusResult = require('../model/copusResult');
const Log = require('../model/log');
const facultySchedule = require('../model/facultySchedule');
const Appointment = require('../model/Appointment');

// Helper function to parse date and time into a single Date object for comparison
function parseDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Note: Month is 0-indexed in JavaScript Date objects
    return new Date(year, month - 1, day, hours, minutes);
}

// Helper to determine semester (assuming your logic for semester is elsewhere or simple)
function getSemester(date) {
    // Example logic, adjust as per your academic calendar
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    if (month >= 8 || month <= 1) { // Aug to Jan (Semester 1)
        return 'Semester 1';
    } else if (month >= 2 && month <= 7) { // Feb to July (Semester 2)
        return 'Semester 2';
    }
    return 'Unknown Semester'; // Fallback
}

const adminController = {
    // GET /admin_dashboard
    getAdminDashboard: async (req, res) => {
        try {
            const user = await User.findById(req.session.user.id);
            if (!user) return res.redirect('/login');

            // Clean up schedules with invalid dates first
            await Schedule.deleteMany({
                $or: [
                    { date: null },
                    { date: { $exists: false } }
                ]
            });

            const schedules = await Schedule.find({});
            const eventMap = {};

            // Group schedules by date with proper date validation
            schedules.forEach(sch => {
                if (!sch.date || isNaN(new Date(sch.date))) {
                    console.log(`Skipping schedule with invalid date:`, sch._id, sch.date);
                    return; // Skip schedules with invalid dates
                }
                
                const date = new Date(sch.date).toISOString().split('T')[0];
                if (!eventMap[date]) eventMap[date] = [];
                eventMap[date].push(sch);
            });

            const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
                const total = scheduleList.length;

                const totalCompleted = scheduleList.filter(s => s.status.toLowerCase() === 'completed').length;
                const totalCancelled = scheduleList.filter(s => s.status.toLowerCase() === 'cancelled').length;
                const totalPending = scheduleList.filter(s => s.status.toLowerCase() === 'pending').length;

                let color = 'orange';
                let statusLabel = 'Pending';

                if (totalCompleted === total) {
                    color = 'green';
                    statusLabel = 'Completed';
                } else if (totalCancelled === total) {
                    color = 'red';
                    statusLabel = 'Cancelled';
                } else if (totalPending === total) {
                    color = 'orange';
                    statusLabel = 'Pending';
                } else {
                    color = 'blue';
                    statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
                }

                return {
                    title: statusLabel,
                    date,
                    color
                };
            });

            res.render('Admin/dashboard', {
                employeeId: user.employeeId,
                firstName: user.firstname,
                lastName: user.lastname,
                calendarEvents: JSON.stringify(calendarEvents)
            });

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            
            // Render dashboard with empty calendar events if there's an error
            try {
                const user = await User.findById(req.session.user.id);
                res.render('Admin/dashboard', {
                    employeeId: user ? user.employeeId : 'Unknown',
                    firstName: user ? user.firstname : 'Unknown',
                    lastName: user ? user.lastname : 'User',
                    calendarEvents: JSON.stringify([]),
                    user: req.session.user // Pass user session for first-login modal
                });
            } catch (renderErr) {
                console.error('Error rendering dashboard:', renderErr);
                res.status(500).send('Internal Server Error');
            }
        }
    },

    getAdminSchedule: async (req, res) => {
        try {
            // First, get the logged-in user for the sidebar
            const user = await User.findById(req.session.user.id);
            if (!user) {
                return res.redirect('/login');
            }

            // Fetch employees from the database
            const employees = await User.find({ role: { $ne: 'admin' } }).sort({ lastname: 1 });

            // Clean up orphaned schedules (schedules with deleted users)
            await Schedule.deleteMany({ faculty_user_id: null });

            // Fetch ALL schedules (not grouped) and populate faculty details
            const allSchedules = await Schedule.find({ faculty_user_id: { $ne: null } })
                .populate('faculty_user_id', 'firstname lastname role department employeeId')
                .sort({ date: 1, start_time: 1 });

            // Identify and clean up schedules with failed populates (referenced user doesn't exist)
            const orphanedScheduleIds = [];
            const validSchedules = allSchedules.filter(schedule => {
                if (!schedule.faculty_user_id) {
                    orphanedScheduleIds.push(schedule._id);
                    return false;
                }
                return true;
            });

            // Remove orphaned schedules if any found
            if (orphanedScheduleIds.length > 0) {
                console.log(`Removing ${orphanedScheduleIds.length} orphaned schedules with invalid user references`);
                await Schedule.deleteMany({ _id: { $in: orphanedScheduleIds } });
            }

            // Map schedules to include all necessary fields for display
            const schedules = validSchedules.map(schedule => ({
                _id: schedule._id,
                faculty_user_id: schedule.faculty_user_id,
                faculty_employee_id: schedule.faculty_employee_id,
                faculty_firstname: schedule.faculty_firstname,
                faculty_lastname: schedule.faculty_lastname,
                faculty_department: schedule.faculty_department,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                copus_type: schedule.copus_type,
                schedule_type: schedule.schedule_type,
                date: schedule.date,
                day_of_week: schedule.day_of_week,
                subject: schedule.faculty_subject_name || schedule.faculty_subject_code || 'N/A',
                subject_code: schedule.faculty_subject_code,
                subject_name: schedule.faculty_subject_name,
                subject_type: schedule.subject_type,
                academic_year: schedule.school_year,
                semester: schedule.semester,
                room: schedule.faculty_room || 'TBA',
                status: schedule.status || 'pending',
                schedule_display: schedule.day_of_week
            }));

            console.log(`Fetched ${schedules.length} schedules for admin view`);

            // Pass all the necessary data to the EJS template
            res.render('Admin/schedule', {
                firstName: user.firstname,
                lastName: user.lastname,
                employeeId: user.employeeId,
                employees: employees,
                schedules: schedules
            });

        } catch (err) {
            console.error('Error fetching admin schedule page:', err);
            res.status(500).send('Internal Server Error');
        }
    },

     createSchedule: async (req, res) => {
        try {
            // Check if a file was uploaded by multer
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No image file uploaded.' });
            }

            const { faculty_user_id } = req.body;

            // Find the user to ensure they exist
            const facultyUser = await User.findById(faculty_user_id);
            if (!facultyUser) {
                return res.status(404).json({ success: false, message: 'Faculty user not found.' });
            }

            // Create the new schedule entry using the FacultySchedule model
            const newSchedule = new FacultySchedule({
                faculty_user_id: facultyUser._id,
                image_path: req.file.path // Save the path provided by Multer
            });

            // Save the new schedule to the database
            await newSchedule.save();

            // Log the activity
            const log = new Log({
                user_id: req.session.user.id,
                action: `Added schedule for faculty member: ${facultyUser.firstname} ${facultyUser.lastname}`,
                details: `File saved at: ${req.file.path}`
            });
            await log.save();

            // Send a success response
            res.status(201).json({ success: true, message: 'Schedule created successfully!', schedule: newSchedule });

        } catch (err) {
            console.error('Error creating schedule:', err);
            res.status(500).json({ success: false, message: 'Failed to create schedule.', error: err.message });
        }
    },

    // NEW METHOD: Create bulk schedules for selected faculty only
    createBulkSchedule: async (req, res) => {
        try {
            console.log('Raw request body:', req.body); // Debug log
            
            const { faculty_ids, target_role, start_time, end_time, department, subject_code, subject_name, subject_type, academic_year, semester, room, days } = req.body;
            const selectedDays = days || [];
            const selectedFacultyIds = faculty_ids || [];

            console.log('Bulk schedule creation:', { faculty_ids: selectedFacultyIds, target_role, start_time, end_time, selectedDays });

            // Validate required fields
            if (!target_role || !start_time || !end_time || selectedDays.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please fill in all required fields and select at least one day.' 
                });
            }

            if (selectedFacultyIds.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please select at least one faculty member.' 
                });
            }

            // Find selected users by employeeId
            const users = await User.find({ 
                employeeId: { $in: selectedFacultyIds }, 
                status: 'Active' 
            });
            
            if (users.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: `No active users found with the selected IDs` 
                });
            }

            console.log(`Found ${users.length} selected users`);

            let createdCount = 0;
            let conflictCount = 0;
            const conflicts = [];
            const Schedule = require('../model/schedule'); // Import Schedule model

            // Helper function to check time overlap
            const hasTimeConflict = (start1, end1, start2, end2) => {
                return (start1 < end2 && end1 > start2);
            };

            // Create schedules for each selected user and each selected day
            for (const user of users) {
                for (const day of selectedDays) {
                    try {
                        // Check for existing schedules with time conflicts
                        const existingSchedules = await Schedule.find({
                            faculty_user_id: user._id,
                            day_of_week: day,
                            status: { $ne: 'cancelled' }
                        });

                        // Check for time conflicts
                        let hasConflict = false;
                        for (const existing of existingSchedules) {
                            if (hasTimeConflict(start_time, end_time, existing.start_time, existing.end_time)) {
                                hasConflict = true;
                                conflicts.push({
                                    faculty: `${user.firstname} ${user.lastname}`,
                                    day: day,
                                    existing_time: `${existing.start_time} - ${existing.end_time}`,
                                    new_time: `${start_time} - ${end_time}`
                                });
                                break;
                            }
                        }

                        if (hasConflict) {
                            conflictCount++;
                            console.log(`Conflict detected for ${user.firstname} ${user.lastname} on ${day}`);
                            continue; // Skip this schedule
                        }

                        // Create a date for the schedule (current week + day)
                        const today = new Date();
                        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const targetDayIndex = daysOfWeek.indexOf(day);
                        
                        // Calculate the date for this day in the current week
                        const daysUntilTarget = (targetDayIndex - currentDay + 7) % 7;
                        const scheduleDate = new Date(today);
                        scheduleDate.setDate(today.getDate() + daysUntilTarget);

                        const newSchedule = new Schedule({
                            date: scheduleDate,
                            day_of_week: day,
                            start_time: start_time,
                            end_time: end_time,
                            faculty_user_id: user._id,
                            faculty_employee_id: user.employeeId,
                            faculty_firstname: user.firstname,
                            faculty_lastname: user.lastname,
                            faculty_department: department || user.department,
                            faculty_subject_code: subject_code || null,
                            faculty_subject_name: subject_name || null,
                            subject_type: subject_type || null,
                            faculty_room: room || 'TBA',
                            copus_type: 'Copus 1',
                            schedule_type: 'bulk_faculty',
                            status: 'pending',
                            school_year: academic_year || null,
                            semester: semester || null,
                            modality: null
                        });

                        console.log('💾 Saving schedule with subject_type:', subject_type);
                        await newSchedule.save();
                        createdCount++;
                        console.log(`Created schedule for ${user.firstname} ${user.lastname} on ${day}`);
                    } catch (scheduleError) {
                        console.error(`Failed to create schedule for ${user.firstname} ${user.lastname} on ${day}:`, scheduleError.message);
                    }
                }
            }

            // Log the bulk creation activity
            const log = new Log({
                user_id: req.session.user.id,
                action: `Bulk schedule creation for role: ${target_role}`,
                details: `Created ${createdCount} schedules for ${users.length} users across ${selectedDays.length} days. ${conflictCount} conflicts detected.`
            });
            await log.save();

            res.status(201).json({ 
                success: true, 
                message: `Successfully created ${createdCount} schedules!${conflictCount > 0 ? ` ${conflictCount} schedules skipped due to time conflicts.` : ''}`,
                created_count: createdCount,
                users_count: users.length,
                days_count: selectedDays.length,
                conflict_count: conflictCount,
                conflicts: conflicts
            });

        } catch (err) {
            console.error('Error creating bulk schedules:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to create bulk schedules.', 
                error: err.message 
            });
        }
    },

    // NEW METHOD: Delete a schedule
    deleteSchedule: async (req, res) => {
        try {
            const { schedule_id } = req.body;

            if (!schedule_id) {
                return res.status(400).json({ success: false, message: 'Schedule ID is required.' });
            }

            const schedule = await Schedule.findByIdAndDelete(schedule_id);

            if (!schedule) {
                return res.status(404).json({ success: false, message: 'Schedule not found.' });
            }

            // Log the deletion
            const log = new Log({
                user_id: req.session.user.id,
                action: 'Delete Schedule',
                details: `Deleted schedule for ${schedule.faculty_firstname} ${schedule.faculty_lastname} on ${schedule.day_of_week} (${schedule.start_time} - ${schedule.end_time})`
            });
            await log.save();

            res.status(200).json({ success: true, message: 'Schedule deleted successfully!' });

        } catch (err) {
            console.error('Error deleting schedule:', err);
            res.status(500).json({ success: false, message: 'Failed to delete schedule.', error: err.message });
        }
    },

    // NEW METHOD: Update a schedule
    updateSchedule: async (req, res) => {
        try {
            const { schedule_id, start_time, end_time, subject_code, subject_name, subject_type, academic_year, semester, room, day_of_week, status } = req.body;

            if (!schedule_id) {
                return res.status(400).json({ success: false, message: 'Schedule ID is required.' });
            }

            // Check for time conflicts (excluding the current schedule being edited)
            const existingSchedules = await Schedule.find({
                _id: { $ne: schedule_id },
                faculty_user_id: (await Schedule.findById(schedule_id)).faculty_user_id,
                day_of_week: day_of_week,
                status: { $ne: 'cancelled' }
            });

            // Helper function to check time overlap
            const hasTimeConflict = (start1, end1, start2, end2) => {
                return (start1 < end2 && end1 > start2);
            };

            let hasConflict = false;
            for (const existing of existingSchedules) {
                if (hasTimeConflict(start_time, end_time, existing.start_time, existing.end_time)) {
                    hasConflict = true;
                    return res.status(409).json({ 
                        success: false, 
                        message: `Time conflict detected with existing schedule on ${day_of_week} (${existing.start_time} - ${existing.end_time})`
                    });
                }
            }

            const updateData = {
                start_time,
                end_time,
                faculty_subject_code: subject_code || null,
                faculty_subject_name: subject_name || null,
                subject_type: subject_type || null,
                school_year: academic_year || null,
                semester: semester || null,
                faculty_room: room || 'TBA',
                day_of_week,
                status
            };

            const updatedSchedule = await Schedule.findByIdAndUpdate(
                schedule_id,
                { $set: updateData },
                { new: true }
            );

            if (!updatedSchedule) {
                return res.status(404).json({ success: false, message: 'Schedule not found.' });
            }

            // Log the update
            const log = new Log({
                user_id: req.session.user.id,
                action: 'Update Schedule',
                details: `Updated schedule for ${updatedSchedule.faculty_firstname} ${updatedSchedule.faculty_lastname} on ${day_of_week}`
            });
            await log.save();

            res.status(200).json({ 
                success: true, 
                message: 'Schedule updated successfully!',
                schedule: updatedSchedule
            });

        } catch (err) {
            console.error('Error updating schedule:', err);
            res.status(500).json({ success: false, message: 'Failed to update schedule.', error: err.message });
        }
    },

  

    // GET /admin_user_management
    getUserManagement: async (req, res) => {
        try {
            // Fetch logged-in user details for the sidebar
            const user = await User.findById(req.session.user.id);
            if (!user) {
                return res.redirect('/login'); // Redirect if user session is invalid
            }

            // Admin sees all roles EXCEPT super_admin
            const employees = await User.find({ role: { $ne: 'super_admin' } });
            res.render('Admin/user_management', {
                employees,
                firstName: user.firstname, // Pass user's first name
                lastName: user.lastname,   // Pass user's last name
                employeeId: user.employeeId // Pass user's employee ID
            });
        } catch (err) {
            console.error('Error fetching user management data:', err);
            res.status(500).send('Failed to load user management view');
        }
    },

    // POST /admin_update_user_status
    updateUserStatus: async (req, res) => {
        const { employeeId, status } = req.body;

        try {
            const user = await User.findById(req.session.user.id);
            const targetEmployee = await User.findOneAndUpdate(
                { employeeId },
                { status },
                { new: true }
            );

            if (!targetEmployee) return res.status(404).send('User not found');

            await Log.create({
                action: 'Update Employee Status',
                performedBy: user.id,
                performedByRole: user.role,
                details: `Changed status of employee ${targetEmployee.firstname} ${targetEmployee.lastname} (ID: ${employeeId}) to ${status}.`
            });

            res.status(200).send('Status updated');
        } catch (err) {
            console.error('Error updating user status:', err);
            res.status(500).send('Failed to update user status');
        }
    },

    // POST /admin_update_user
    updateUser: async (req, res) => {
        const { 
            employeeId, 
            department, 
            lastname, 
            firstname, 
            middleInitial,
            role, 
            email,
            dean,
            assignedProgramHead,
            yearsOfTeachingExperience,
            yearHired,
            yearRegularized,
            highestEducationalAttainment,
            professionalLicense,
            employmentStatus,
            rank
        } = req.body;

        try {
            const user = await User.findById(req.session.user.id);
            
            // Build update object with all fields
            const updateData = {
                department, 
                lastname, 
                firstname, 
                middleInitial: middleInitial || '',
                role, 
                email,
                dean: dean || '',
                assignedProgramHead: assignedProgramHead || '',
                yearsOfTeachingExperience: yearsOfTeachingExperience || '',
                yearHired: yearHired || '',
                yearRegularized: yearRegularized || '',
                highestEducationalAttainment: highestEducationalAttainment || '',
                professionalLicense: professionalLicense || '',
                employmentStatus: employmentStatus || '',
                rank: rank || ''
            };
            
            const updated = await User.findOneAndUpdate(
                { employeeId },
                updateData,
                { new: true }
            );

            if (!updated) return res.status(404).send('Employee not found');

            await Log.create({
                action: 'Update Employee',
                performedBy: user.id,
                performedByRole: user.role,
                details: `Updated employee: ${firstname} ${lastname} (ID: ${employeeId}), role: ${role}, department: ${department}.`
            });

            req.flash('success_msg', 'User updated successfully!'); // Add flash message
            res.redirect('/admin_user_management');
        } catch (err) {
            console.error('Error updating user:', err);
            req.flash('error_msg', 'Failed to update user.'); // Add flash message
            res.status(500).redirect('/admin_user_management'); // Redirect to user management on error
        }
    },
    
    

    // GET /admin_copus_result
    getCopusResult: async (req, res) => {
        try {
            const user = await User.findById(req.session.user.id);
            if (!user) return res.redirect('/login');

            console.log('🔍 Admin fetching dashboard data with filters...');
            
            // Get filter parameters from query
            const { semester, year, subject } = req.query;
            
            // Build filter query for ObserverSchedule
            const ObserverSchedule = require('../model/observerSchedule');
            let scheduleFilter = {};
            
            if (semester && semester !== 'All Semesters') {
                scheduleFilter.semester = semester;
            }
            if (year && year !== 'All Years') {
                scheduleFilter.year_level = year;
            }
            if (subject && subject !== 'All Subjects') {
                scheduleFilter.subject = subject;
            }
            
            // Fetch ALL observer schedules with filters
            const allSchedules = await ObserverSchedule.find(scheduleFilter)
                .populate('faculty_user_id', 'firstname lastname department employeeId')
                .populate('observer_id', 'firstname lastname')
                .sort({ observation_date: 1, start_time: 1 })
                .lean();
            
            console.log(`📊 Found ${allSchedules.length} total observer schedules (filtered)`);
            
            // Calculate dashboard card data
            // Total Upcoming: All schedules NOT completed (pending, scheduled, in_progress, etc.)
            const upcomingSchedules = allSchedules.filter(s => s.status !== 'completed');
            const totalUpcoming = upcomingSchedules.length;
            
            // Completed COPUS: All schedules with status 'completed'
            const completedSchedules = allSchedules.filter(s => s.status === 'completed');
            const totalCompleted = completedSchedules.length;
            
            // Total Users: Count ALL users (no filter applies)
            const totalUsers = await User.countDocuments({});
            
            // Faculty Teachers: Count ALL faculty users (no filter applies)
            const totalFaculty = await User.countDocuments({ role: 'Faculty' });
            
            // Get unique semesters, years, and subjects for filters
            const allSchedulesForFilters = await ObserverSchedule.find({}).lean();
            const semesters = [...new Set(allSchedulesForFilters.map(s => s.semester).filter(Boolean))];
            const years = [...new Set(allSchedulesForFilters.map(s => s.year_level).filter(Boolean))];
            const subjects = [...new Set(allSchedulesForFilters.map(s => s.subject).filter(Boolean))].sort();
            
            // Fetch chart data from copusresults collection
            const chartData = await adminController.getChartData();
            
            // Build filter label for dynamic card titles
            let filterLabel = '';
            const filterParts = [];
            if (semester && semester !== 'All Semesters') filterParts.push(semester);
            if (year && year !== 'All Years') filterParts.push(year);
            if (subject && subject !== 'All Subjects') filterParts.push(subject);
            if (filterParts.length > 0) {
                filterLabel = ` (${filterParts.join(', ')})`;
            }

            res.render('Admin/copus_result', {
                completedSchedules: completedSchedules,
                firstName: user.firstname,
                lastName: user.lastname,
                employeeId: user.employeeId,
                chartData: chartData,
                user: req.session.user, // Pass user session for first-login modal
                // Dashboard card data
                totalUpcoming: totalUpcoming || 0,
                totalCompleted: totalCompleted || 0,
                totalUsers: totalUsers || 0,
                totalFaculty: totalFaculty || 0,
                filterLabel: filterLabel || '',
                // Filter options
                semesters: semesters || [],
                years: years || [],
                subjects: subjects || [],
                // Current filter values
                selectedSemester: semester || 'All Semesters',
                selectedYear: year || 'All Years',
                selectedSubject: subject || 'All Subjects'
            });
        } catch (err) {
            console.error('Error fetching Copus Result page:', err);
            res.status(500).send('Internal Server Error');
        }
    },

    // GET /admin_copus_history
    getCopusHistory: async (req, res) => {
        try {
            const user = await User.findById(req.session.user.id);
            if (!user) return res.redirect('/login');

            console.log('🔍 Admin fetching ALL COPUS results from copusresults collection...');
            
            // Fetch ALL COPUS results from copusresults collection (Admin can see everything)
            const copusResults = await CopusResult.find({})
                .sort({ evaluation_date: -1, submitted_at: -1 })
                .lean();

            console.log(`📊 Found ${copusResults.length} total COPUS results for Admin view`);

            res.render('Admin/copus_history', {
                firstName: user.firstname,
                lastName: user.lastname,
                employeeId: user.employeeId,
                copusResults: copusResults,
                error_msg: req.flash('error'),
                success_msg: req.flash('success')
            });
        } catch (err) {
            console.error('Error fetching Copus History page:', err);
            res.status(500).send('Internal Server Error');
        }
    },

    // GET /admin_setting
    getSetting: async (req, res) => {
        try {
            const user = await User.findById(req.session.user.id);
            if (!user) return res.redirect('/login');

            res.render('Admin/setting', {
                firstName: user.firstname,
                lastName: user.lastname,
                employeeId: user.employeeId,
                currentUser: user
            });
        } catch (err) {
            console.error('Error fetching Settings page:', err);
            res.status(500).send('Internal Server Error');
        }
    },

    // POST /admin_update_profile - Update Admin's own profile
    updateProfile: async (req, res) => {
        const userId = req.session.user.id;

        const allowedUpdates = [
            'firstname', 'lastname', 'middleInitial', 'email', 'department', 'dean',
            'assignedProgramHead', 'yearsOfTeachingExperience', 'yearHired',
            'yearRegularized', 'highestEducationalAttainment', 'professionalLicense',
            'employmentStatus', 'rank'
        ];

        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            } else if (req.body[key] === undefined && (key === 'middleInitial' || key === 'assignedProgramHead')) {
                updates[key] = '';
            }
        }

        if (updates.email && !/\S+@\S+\.\S+/.test(updates.email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        try {
            const oldUser = await User.findById(userId).lean();

            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Update session data
            req.session.user.firstname = updatedUser.firstname;
            req.session.user.lastname = updatedUser.lastname;
            req.session.user.email = updatedUser.email;
            await req.session.save();

            let logDetails = 'Admin updated own profile. Changes: ';
            const changedFieldsArray = [];
            for (const key in updates) {
                if (oldUser && String(oldUser[key]) !== String(updatedUser[key])) {
                    changedFieldsArray.push(`${key} (from '${oldUser[key] || ''}' to '${updatedUser[key] || ''}')`);
                } else if (!oldUser && updatedUser[key]) {
                    changedFieldsArray.push(`${key} (set to '${updatedUser[key] || ''}')`);
                }
            }
            logDetails += changedFieldsArray.length > 0 ? changedFieldsArray.join(', ') : 'No values changed effectively.';

            await Log.create({
                action: 'Update Own Profile',
                performedBy: userId,
                performedByRole: updatedUser.role,
                details: logDetails
            });

            res.status(200).json({
                message: 'Profile updated successfully!',
                user: {
                    firstname: updatedUser.firstname,
                    lastname: updatedUser.lastname,
                    email: updatedUser.email
                }
            });

        } catch (error) {
            console.error('Error updating own user profile:', error);
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(e => e.message);
                return res.status(400).json({ message: 'Validation Error: ' + messages.join(', ') });
            }
            if (error.code === 11000) {
                return res.status(400).json({ message: 'Update failed. Email or another unique field may already be in use.' });
            }
            res.status(500).json({ message: 'Failed to update profile due to a server error.' });
        }
    },

    // POST /add_employee - Add new employee (Admin version)
    addEmployee: async (req, res) => {
        const bcrypt = require('bcryptjs');
        const nodemailer = require('nodemailer');
        
        const {
            employeeId,
            department,
            lastname,
            firstname,
            middleInitial,
            role,
            email,
            dean,
            assignedProgramHead,
            yearsOfTeachingExperience,
            yearHired,
            yearRegularized,
            highestEducationalAttainment,
            professionalLicense,
            employmentStatus,
            rank
        } = req.body;

    // Default password for new users
    const password = 'password123';
    const user = await User.findById(req.session.user.id);

    try {
        // Validate that admin can only create Faculty, Observer (ALC), Observer (SLC) roles
        const allowedRoles = ['Faculty', 'Observer (ALC)', 'Observer (SLC)'];
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ error: 'You do not have permission to create this role.' });
        }            const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email or employee ID already exists.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new User({
                employeeId,
                department,
                lastname,
                firstname,
                middleInitial: middleInitial || '',
                role,
                email,
                password: hashedPassword,
                isFirstLogin: true, // Force password change on first login
                dean: dean || '',
                assignedProgramHead: assignedProgramHead || '',
                yearsOfTeachingExperience: yearsOfTeachingExperience || '',
                yearHired: yearHired || '',
                yearRegularized: yearRegularized || '',
                highestEducationalAttainment: highestEducationalAttainment || '',
                professionalLicense: professionalLicense || '',
                employmentStatus: employmentStatus || '',
                rank: rank || ''
            });

            await newUser.save();

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'copus6251@gmail.com',
                    pass: 'ugpc lsxi pmro bwno'
                }
            });

            const mailOptions = {
                from: '"Admin" <copus6251@gmail.com>',
                to: email,
                subject: 'Your Login Credentials - PHINMA Copus System',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;">
                      <h2 style="color: #2c3e50;">Hello ${firstname} ${lastname},</h2>
                      <p style="font-size: 15px; color: #333;">Welcome to the <strong>PHINMA Copus System</strong>! Your account has been created successfully.</p>
                      
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ IMPORTANT: Account Status</p>
                    <p style="margin: 5px 0 0 0; color: #856404;">The account is inactive and will only be activated once logged in.</p>
                    <p style="margin: 5px 0 0 0; color: #856404;">You will be required to change your password immediately upon first login for security purposes.</p>
                  </div>                      <div style="margin: 20px 0; background-color: #ffffff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Your Login Credentials:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px; font-weight: bold; color: #555;">Email:</td>
                            <td style="padding: 8px; color: #333;">${email}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px; font-weight: bold; color: #555;">Role:</td>
                            <td style="padding: 8px; color: #333;">${role}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px; font-weight: bold; color: #555;">Username (Employee ID):</td>
                            <td style="padding: 8px; color: #333; font-family: monospace; background-color: #f8f9fa; padding: 5px 10px; border-radius: 3px;">${employeeId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px; font-weight: bold; color: #555;">Temporary Password:</td>
                            <td style="padding: 8px; color: #333; font-family: monospace; background-color: #f8f9fa; padding: 5px 10px; border-radius: 3px;">password123</td>
                          </tr>
                        </table>
                      </div>
                      
                      <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0; color: #0c5460; font-weight: bold;">📝 Next Steps:</p>
                        <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #0c5460;">
                          <li>Go to the login page</li>
                          <li>Enter your Employee ID and temporary password</li>
                          <li>You will be automatically redirected to change your password</li>
                          <li>Choose a strong, secure password</li>
                        </ol>
                      </div>
                
                      <p style="font-size: 13px; color: #666; margin-top: 30px;">If you have any questions or need assistance, please contact the IT support team.</p>
                      <p style="margin-top: 30px; font-size: 14px; color: #555;">Best regards,<br><strong>PHINMA IT Team</strong></p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent successfully to', email);

            await Log.create({
                action: 'Add Employee',
                performedBy: user._id,
                performedByRole: user.role,
                details: `Added an employee name : ${firstname} ${lastname} employee ID : (${employeeId}) with role ${role} in ${department}.`
            });

            // Return JSON success response for AJAX request
            return res.status(200).json({ 
                success: true, 
                message: 'User created successfully and email sent!' 
            });

        } catch (err) {
            console.error('Error adding user or sending email:', err);
            if (err.code === 11000) {
                return res.status(400).json({ error: 'User with this email or employee ID already exists.' });
            }
            res.status(500).json({ error: 'Failed to add user or send email due to a server error.' });
        }
    },

    // Helper function to get chart data
    getChartData: async function() {
        try {
            // Get top 10 highest scores
            const topHighest = await CopusResult.find({ overall_percentage: { $exists: true, $ne: null } })
                .sort({ overall_percentage: -1 })
                .limit(10)
                .select('faculty_name overall_percentage final_rating')
                .lean();

            // Get top 10 lowest scores
            const topLowest = await CopusResult.find({ overall_percentage: { $exists: true, $ne: null } })
                .sort({ overall_percentage: 1 })
                .limit(10)
                .select('faculty_name overall_percentage final_rating')
                .lean();

            // Get top 1 overall score
            const topOverall = await CopusResult.findOne({ overall_percentage: { $exists: true, $ne: null } })
                .sort({ overall_percentage: -1 })
                .select('faculty_name overall_percentage final_rating')
                .lean();

            return {
                topHighest: topHighest || [],
                topLowest: topLowest || [],
                topOverall: topOverall || null
            };
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return {
                topHighest: [],
                topLowest: [],
                topOverall: null
            };
        }
    },

    // GET /admin_copus_appointments - View all appointments
    getCopusAppointments: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user.id) {
                req.flash('error', 'Session expired. Please log in again.');
                return res.redirect('/login');
            }

            const user = await User.findById(req.session.user.id);
            if (!user) {
                req.flash('error', 'User not found. Please log in again.');
                return res.redirect('/login');
            }

            // Fetch all appointments
            const appointments = await Appointment.find({})
                .populate('copus_result_id')
                .populate('faculty_id', 'firstname lastname')
                .populate('observer_id', 'firstname lastname')
                .sort({ created_at: -1 })
                .lean();

            // Filter out appointments without copus_result_id and format the data
            const formattedAppointments = appointments
                .filter(apt => apt.copus_result_id) // Only include appointments with valid COPUS results
                .map(apt => ({
                    ...apt,
                    copusResult: apt.copus_result_id,
                    faculty_name: apt.faculty_id ? `${apt.faculty_id.firstname} ${apt.faculty_id.lastname}` : 'N/A',
                    observer_name: apt.observer_id ? `${apt.observer_id.firstname} ${apt.observer_id.lastname}` : 'N/A'
                }));

            res.render('Admin/copus_appointments', {
                firstName: user.firstname,
                lastName: user.lastname,
                employeeId: user.employeeId || 'N/A',
                userRole: user.role,
                userId: user._id,
                appointments: formattedAppointments,
                success: req.flash('success'),
                error: req.flash('error')
            });

        } catch (err) {
            console.error('Error fetching copus appointments:', err);
            req.flash('error', 'An error occurred while loading appointments.');
            res.redirect('/admin_dashboard');
        }
    },

    // DELETE /admin_delete_appointment/:id - Delete an appointment
    deleteAppointment: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user.id) {
                return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
            }

            const user = await User.findById(req.session.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            const { id } = req.params;

            // Find appointment
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return res.status(404).json({ success: false, message: 'Appointment not found.' });
            }

            await Appointment.findByIdAndDelete(id);

            // Log the action
            await Log.create({
                user_id: user._id,
                action: 'delete_appointment',
                details: `Admin ${user.firstname} ${user.lastname} deleted appointment ${id}`,
                timestamp: new Date()
            });

            res.json({ success: true, message: 'Appointment deleted successfully!' });

        } catch (err) {
            console.error('Error deleting appointment:', err);
            res.status(500).json({ success: false, message: 'An error occurred while deleting the appointment.' });
        }
    },
};

module.exports = adminController;