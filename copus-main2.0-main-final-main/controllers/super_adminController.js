// controllers/super_adminController.js

// Import necessary models and helpers (assuming they are defined elsewhere)
const User = require('../model/employee'); // Adjust path as per your project structure
const Schedule = require('../model/schedule'); // Adjust path
const CopusObservation = require('../model/copusObservation'); // Adjust path
const CopusResult = require('../model/copusResult'); // COPUS results model
const Log = require('../model/log'); // Adjust path
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Appointment = require('../model/Appointment');

// Helper function (if it's not global or part of a utilities file)
function parseDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Month is 0-indexed in Date constructor
    return new Date(year, month - 1, day, hours, minutes);
}


// Dashboard Controller
exports.getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');

        // --- Fetching Metric Card Data ---
        const totalObservations = await Schedule.countDocuments({});
        const totalObservers = await User.countDocuments({ 
            role: { $in: ['Observer (ALC)', 'Observer (SLC)'] } 
        });
        const totalCitFaculty = await User.countDocuments({ role: 'Faculty' });

        // --- Existing Calendar Event Logic ---
        const schedules = await Schedule.find({});
        const eventMap = {};

        schedules.forEach(sch => {
            const date = new Date(sch.date).toISOString().split('T')[0];
            if (!eventMap[date]) eventMap[date] = [];
            eventMap[date].push(sch);
        });

        const calendarEvents = Object.entries(eventMap).map(([date, scheduleList]) => {
            const total = scheduleList.length;
            const totalCompleted = scheduleList.filter(s => s.status && s.status.toLowerCase() === 'completed').length;
            const totalCancelled = scheduleList.filter(s => s.status && s.status.toLowerCase() === 'cancelled').length;
            const totalPending = scheduleList.filter(s => s.status && s.status.toLowerCase() === 'pending').length;

            let color = 'orange'; // Default to pending
            let statusLabel = 'Pending';

            if (totalCompleted === total && total > 0) {
                color = 'green';
                statusLabel = 'Completed';
            } else if (totalCancelled === total && total > 0) {
                color = 'red';
                statusLabel = 'Cancelled';
            } else if (totalPending === total && total > 0) {
                color = 'orange';
                statusLabel = 'Pending';
            } else if (totalCompleted > 0 || totalCancelled > 0 || totalPending > 0) {
                color = 'blue';
                statusLabel = `${totalCompleted} ✅ / ${totalCancelled} ❌ / ${totalPending} ⏳`;
            } else {
                color = 'gray';
                statusLabel = 'No Schedules';
            }

            return {
                title: statusLabel,
                start: date,
                color
            };
        });

        res.render('Super_Admin/dashboard', {
            employeeId: user.employeeId,
            firstName: user.firstname,
            lastName: user.lastname,
            totalObservations: totalObservations,
            totalObservers: totalObservers,
            totalCitFaculty: totalCitFaculty,
            calendarEvents: JSON.stringify(calendarEvents),
            user: req.session.user // Pass user session for first-login modal
        });

    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Start Copus 1 Observation
exports.startCopus1 = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        const schedule = await Schedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).send('Schedule not found');
        }

        const currentUser = await User.findById(req.session.user.id);
        if (!currentUser) return res.status(401).send('Unauthorized');

        // Allow multiple users to start their own COPUS observations independently
        // Update schedule status to in progress if not already
        if (schedule.status !== 'in progress') {
            schedule.status = 'in progress';
            await schedule.save();
        }

        req.session.scheduleId = scheduleId;

        const copusDetails = {
            fullname: `${schedule.firstname} ${schedule.lastname}`,
            department: schedule.department,
            date: new Date(schedule.date).toLocaleDateString(),
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            yearLevel: schedule.year_level,
            semester: schedule.semester,
            subjectCode: schedule.subject_code,
            subjectName: schedule.subject,
            mode: schedule.modality,
            observer: schedule.observer,
            copusType: schedule.copus
        };

        console.log(`Starting Copus 1 for schedule ID: ${scheduleId}`);

        res.render('super_admin/copus_start', {
            copusDetails,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId
        });
    } catch (error) {
        console.error('Error fetching schedule for Copus 1:', error);
        res.status(500).send('Internal server error');
    }
};

// Start Copus 2 Observation
exports.startCopus2 = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        const schedule = await Schedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).send('Schedule not found');
        }

        const currentUser = await User.findById(req.session.user.id);
        if (!currentUser) return res.status(401).send('Unauthorized');

        // Allow multiple users to start their own COPUS observations independently
        // Update schedule status to in progress if not already
        if (schedule.status !== 'in progress') {
            schedule.status = 'in progress';
            await schedule.save();
        }

        req.session.scheduleId = scheduleId;

        const copusDetails = {
            fullname: `${schedule.firstname} ${schedule.lastname}`,
            department: schedule.department,
            date: new Date(schedule.date).toLocaleDateString(),
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            yearLevel: schedule.year_level,
            semester: schedule.semester,
            subjectCode: schedule.subject_code,
            subjectName: schedule.subject,
            mode: schedule.modality,
            observer: schedule.observer,
            copusType: schedule.copus
        };

        console.log(`Starting Copus 2 for schedule ID: ${scheduleId}`);

        res.render('super_admin/copus_start2', {
            copusDetails,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId
        });
    } catch (error) {
        console.error('Error fetching schedule for Copus 2:', error);
        res.status(500).send('Internal server error');
    }
};

// Start Copus 3 Observation
exports.startCopus3 = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        const schedule = await Schedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).send('Schedule not found');
        }

        const currentUser = await User.findById(req.session.user.id);
        if (!currentUser) return res.status(401).send('Unauthorized');

        // Allow multiple users to start their own COPUS observations independently
        // Update schedule status to in progress if not already
        if (schedule.status !== 'in progress') {
            schedule.status = 'in progress';
            await schedule.save();
        }

        req.session.scheduleId = scheduleId;

        const copusDetails = {
            fullname: `${schedule.firstname} ${schedule.lastname}`,
            department: schedule.department,
            date: new Date(schedule.date).toLocaleDateString(),
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            yearLevel: schedule.year_level,
            semester: schedule.semester,
            subjectCode: schedule.subject_code,
            subjectName: schedule.subject,
            mode: schedule.modality,
            observer: schedule.observer,
            copusType: schedule.copus
        };

        console.log(`Starting Copus 3 for schedule ID: ${scheduleId}`);

        res.render('super_admin/copus_start3', {
            copusDetails,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId
        });
    } catch (error) {
        console.error('Error fetching schedule for Copus 3:', error);
        res.status(500).send('Internal server error');
    }
};

// Display Copus 1 result (with scheduleId in URL)
exports.getResultCopus1ById = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('Schedule ID is missing from URL.');
        }

        const copusObservation = await CopusObservation.findOne({
            scheduleId: scheduleId,
            copusNumber: 1,
            observerId: req.session.user.id
        }).sort({ dateSubmitted: -1 }).exec();

        if (!copusObservation) {
            return res.status(404).send('No Copus 1 observation found for this schedule.');
        }

        const scheduleDetails = await Schedule.findById(scheduleId);
        if (!scheduleDetails) {
            return res.status(404).send('Schedule details not found.');
        }

        const tallies = {
            studentActions: Object.fromEntries(copusObservation.studentActions || new Map()),
            teacherActions: Object.fromEntries(copusObservation.teacherActions || new Map()),
            engagementLevels: copusObservation.engagementLevels || { High: 0, Med: 0, Low: 0 },
        };

        const totalIntervals = Object.values(tallies.studentActions).reduce((sum, count) => sum + count, 0);

        const engagementPercentages = {
            High: totalIntervals > 0 ? (tallies.engagementLevels.High / totalIntervals) * 100 : 0,
            Med: totalIntervals > 0 ? (tallies.engagementLevels.Med / totalIntervals) * 100 : 0,
            Low: totalIntervals > 0 ? (tallies.engagementLevels.Low / totalIntervals) * 100 : 0
        };

        const copusDetails = {
            copusType: `Copus ${copusObservation.copusNumber}`
        };

        res.render('super_admin/copus_result1', {
            tallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId,
            scheduleId: scheduleId,
            copusDetails: copusDetails,
            scheduleDetails: scheduleDetails
        });
    } catch (err) {
        console.error('Error retrieving Copus 1 observation results:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Display Copus 2 result (with scheduleId in URL)
exports.getResultCopus2ById = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('Schedule ID is missing from URL.');
        }

        const copusObservation = await CopusObservation.findOne({
            scheduleId: scheduleId,
            copusNumber: 2,
            observerId: req.session.user.id
        }).sort({ dateSubmitted: -1 }).exec();

        if (!copusObservation) {
            return res.status(404).send('No Copus 2 observation found for this schedule.');
        }

        const scheduleDetails = await Schedule.findById(scheduleId);
        if (!scheduleDetails) {
            return res.status(404).send('Schedule details not found.');
        }

        const tallies = {
            studentActions: copusObservation.studentActions || {},
            teacherActions: copusObservation.teacherActions || {},
            engagementLevels: copusObservation.engagementLevels || { High: 0, Med: 0, Low: 0 },
        };

        const totalIntervals = Object.values(tallies.studentActions).reduce((sum, count) => sum + count, 0);

        const engagementPercentages = {
            High: totalIntervals > 0 ? (tallies.engagementLevels.High / totalIntervals) * 100 : 0,
            Med: totalIntervals > 0 ? (tallies.engagementLevels.Med / totalIntervals) * 100 : 0,
            Low: totalIntervals > 0 ? (tallies.engagementLevels.Low / totalIntervals) * 100 : 0
        };

        res.render('super_admin/copus_result2', {
            tallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId,
            scheduleDetails: scheduleDetails
        });
    } catch (err) {
        console.error('Error retrieving Copus 2 observation results:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Display aggregated Copus 3 result (with scheduleId in URL)
exports.getAggregatedResultCopus3ById = async (req, res) => {
    try {
        const scheduleId = req.params.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('Schedule ID is missing from URL.');
        }

        const scheduleDetails = await Schedule.findById(scheduleId);
        if (!scheduleDetails) {
            return res.status(404).send('Schedule details not found.');
        }

        const copusObservations = await CopusObservation.find({
            scheduleId: scheduleId,
            observerId: req.session.user.id
        }).exec();

        if (copusObservations.length === 0) {
            return res.status(404).send('No observations found for this schedule.');
        }

        const aggregatedTallies = {
            studentActions: {},
            teacherActions: {},
            engagementLevels: { High: 0, Med: 0, Low: 0 },
            totalIntervals: 0
        };

        copusObservations.forEach(obs => {
            for (const [action, count] of Object.entries(obs.studentActions || {})) {
                aggregatedTallies.studentActions[action] = (aggregatedTallies.studentActions[action] || 0) + count;
            }

            for (const [action, count] of Object.entries(obs.teacherActions || {})) {
                aggregatedTallies.teacherActions[action] = (aggregatedTallies.teacherActions[action] || 0) + count;
            }

            for (const level of ['High', 'Med', 'Low']) {
                aggregatedTallies.engagementLevels[level] += obs.engagementLevels?.[level] || 0;
            }

            aggregatedTallies.totalIntervals += Object.values(obs.studentActions || {}).reduce((a, b) => a + b, 0);
        });

        const engagementPercentages = {
            High: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.High / aggregatedTallies.totalIntervals) * 100 : 0,
            Med: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.Med / aggregatedTallies.totalIntervals) * 100 : 0,
            Low: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.Low / aggregatedTallies.totalIntervals) * 100 : 0
        };

        res.render('super_admin/copus_result3', {
            tallies: aggregatedTallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId,
            scheduleDetails: scheduleDetails
        });
    } catch (err) {
        console.error('Error retrieving aggregated COPUS observations:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Save Copus 1 Observation
exports.saveCopus1 = async (req, res) => {
    try {
        const { rows } = req.body;
        const user = req.session.user;
        const scheduleId = req.session.scheduleId;
        const copusNumber = 1;

        if (!scheduleId) {
            return res.status(400).send('Schedule ID not found in session. Please start an observation first.');
        }

        const collectedComments = rows.map(row => row.comment).filter(Boolean).join(' ') || 'No comments provided.';

        const copusObservation = new CopusObservation({
            scheduleId,
            copusNumber,
            studentActions: rows.reduce((acc, row) => {
                for (const action in row.student) {
                    acc[action] = (acc[action] || 0) + row.student[action];
                }
                return acc;
            }, {}),
            teacherActions: rows.reduce((acc, row) => {
                for (const action in row.teacher) {
                    acc[action] = (acc[action] || 0) + row.teacher[action];
                }
                return acc;
            }, {}),
            engagementLevels: {
                High: rows.reduce((acc, row) => acc + (row.engagement?.High || 0), 0),
                Med: rows.reduce((acc, row) => acc + (row.engagement?.Med || 0), 0),
                Low: rows.reduce((acc, row) => acc + (row.engagement?.Low || 0), 0),
            },
            comments: collectedComments,
            observerId: user.id
        });

        await copusObservation.save();

        res.redirect(`/super_admin_copus_result1/${scheduleId}`); // Redirect with scheduleId
    } catch (err) {
        console.error('Error saving COPUS 1 observation:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Save Copus 2 Observation
exports.saveCopus2 = async (req, res) => {
    try {
        const { rows } = req.body;
        const user = req.session.user;
        const scheduleId = req.session.scheduleId;
        const copusNumber = 2;

        if (!scheduleId) {
            return res.status(400).send('Schedule ID not found in session. Please start an observation first.');
        }

        const copusObservation = new CopusObservation({
            scheduleId,
            copusNumber,
            studentActions: rows.reduce((acc, row) => {
                for (const action in row.student) {
                    acc[action] = (acc[action] || 0) + row.student[action];
                }
                return acc;
            }, {}),
            teacherActions: rows.reduce((acc, row) => {
                for (const action in row.teacher) {
                    acc[action] = (acc[action] || 0) + row.teacher[action];
                }
                return acc;
            }, {}),
            engagementLevels: {
                High: rows.reduce((acc, row) => acc + (row.engagement?.High || 0), 0),
                Med: rows.reduce((acc, row) => acc + (row.engagement?.Med || 0), 0),
                Low: rows.reduce((acc, row) => acc + (row.engagement?.Low || 0), 0),
            },
            comments: rows.map(row => row.comment).filter(Boolean).join(' '),
            observerId: user.id
        });

        await copusObservation.save();

        res.redirect(`/super_admin_copus_result2/${scheduleId}`); // Redirect with scheduleId
    } catch (err) {
        console.error('Error saving COPUS 2 observation:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Save Copus 3 Observation
exports.saveCopus3 = async (req, res) => {
    try {
        const { rows } = req.body;
        const user = req.session.user;
        const scheduleId = req.session.scheduleId;
        const copusNumber = 3;

        if (!scheduleId) {
            return res.status(400).send('Schedule ID not found in session. Please start an observation first.');
        }

        const markSched = await Schedule.findById(scheduleId);
        if (markSched) {
            markSched.status = "completed";
            await markSched.save();
        } else {
            console.warn('Schedule not found when trying to mark as completed:', scheduleId);
        }

        const copusObservation = new CopusObservation({
            scheduleId,
            copusNumber,
            studentActions: rows.reduce((acc, row) => {
                for (const action in row.student) {
                    acc[action] = (acc[action] || 0) + row.student[action];
                }
                return acc;
            }, {}),
            teacherActions: rows.reduce((acc, row) => {
                for (const action in row.teacher) {
                    acc[action] = (acc[action] || 0) + row.teacher[action];
                }
                return acc;
            }, {}),
            engagementLevels: {
                High: rows.reduce((acc, row) => acc + (row.engagement?.High || 0), 0),
                Med: rows.reduce((acc, row) => acc + (row.engagement?.Med || 0), 0),
                Low: rows.reduce((acc, row) => acc + (row.engagement?.Low || 0), 0),
            },
            comments: rows.map(row => row.comment).filter(Boolean).join(' '),
            observerId: user.id
        });

        await copusObservation.save();

        res.redirect(`/super_admin_copus_result3/${scheduleId}`); // Redirect with scheduleId
    } catch (err) {
        console.error('Error saving COPUS 3 observation:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Display Copus 1 result (relying on session scheduleId) - **Consider deprecating this in favor of ID-based ones**
exports.getResultCopus1 = async (req, res) => {
    try {
        const scheduleId = req.session.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('No active schedule found in session.');
        }

        const copusObservation = await CopusObservation.findOne({
            scheduleId: scheduleId,
            copusNumber: 1,
            observerId: req.session.user.id
        }).sort({ dateSubmitted: -1 }).exec();

        if (!copusObservation) {
            return res.status(404).send('No Copus 1 observation found for this schedule.');
        }

        const tallies = {
            studentActions: Object.fromEntries(copusObservation.studentActions || new Map()),
            teacherActions: Object.fromEntries(copusObservation.teacherActions || new Map()),
            engagementLevels: copusObservation.engagementLevels || { High: 0, Med: 0, Low: 0 },
        };

        const totalIntervals = Object.values(tallies.studentActions).reduce((sum, count) => sum + count, 0);

        const engagementPercentages = {
            High: totalIntervals > 0 ? (tallies.engagementLevels.High / totalIntervals) * 100 : 0,
            Med: totalIntervals > 0 ? (tallies.engagementLevels.Med / totalIntervals) * 100 : 0,
            Low: totalIntervals > 0 ? (tallies.engagementLevels.Low / totalIntervals) * 100 : 0
        };

        const copusDetails = {
            copusType: `Copus ${copusObservation.copusNumber}`
        };

        res.render('super_admin/copus_result1', {
            tallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId,
            scheduleId: scheduleId,
            copusDetails: copusDetails
        });
    } catch (err) {
        console.error('Error retrieving Copus 1 observation results:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Display Copus 2 result (relying on session scheduleId) - **Consider deprecating this in favor of ID-based ones**
exports.getResultCopus2 = async (req, res) => {
    try {
        const scheduleId = req.session.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('No active schedule found in session.');
        }

        const copusObservation = await CopusObservation.findOne({
            scheduleId: scheduleId,
            copusNumber: 2,
            observerId: req.session.user.id
        }).sort({ dateSubmitted: -1 }).exec();

        if (!copusObservation) {
            return res.status(404).send('No Copus 2 observation found for this schedule.');
        }

        const tallies = {
            studentActions: copusObservation.studentActions || {},
            teacherActions: copusObservation.teacherActions || {},
            engagementLevels: copusObservation.engagementLevels || { High: 0, Med: 0, Low: 0 },
        };

        const totalIntervals = Object.values(tallies.studentActions).reduce((sum, count) => sum + count, 0);

        const engagementPercentages = {
            High: totalIntervals > 0 ? (tallies.engagementLevels.High / totalIntervals) * 100 : 0,
            Med: totalIntervals > 0 ? (tallies.engagementLevels.Med / totalIntervals) * 100 : 0,
            Low: totalIntervals > 0 ? (tallies.engagementLevels.Low / totalIntervals) * 100 : 0
        };

        res.render('super_admin/copus_result2', {
            tallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId
        });
    } catch (err) {
        console.error('Error retrieving Copus 2 observation results:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Display aggregated Copus 3 result (relying on session scheduleId) - **Consider deprecating this in favor of ID-based ones**
exports.getAggregatedResultCopus3 = async (req, res) => {
    try {
        const scheduleId = req.session.scheduleId;
        if (!scheduleId) {
            return res.status(400).send('No active schedule found in session.');
        }

        const copusObservations = await CopusObservation.find({
            scheduleId: scheduleId,
            observerId: req.session.user.id
        }).exec();

        if (copusObservations.length === 0) {
            return res.status(404).send('No observations found for this schedule.');
        }

        const aggregatedTallies = {
            studentActions: {},
            teacherActions: {},
            engagementLevels: { High: 0, Med: 0, Low: 0 },
            totalIntervals: 0
        };

        copusObservations.forEach(obs => {
            for (const [action, count] of Object.entries(obs.studentActions || {})) {
                aggregatedTallies.studentActions[action] = (aggregatedTallies.studentActions[action] || 0) + count;
            }

            for (const [action, count] of Object.entries(obs.teacherActions || {})) {
                aggregatedTallies.teacherActions[action] = (aggregatedTallies.teacherActions[action] || 0) + count;
            }

            for (const level of ['High', 'Med', 'Low']) {
                aggregatedTallies.engagementLevels[level] += obs.engagementLevels?.[level] || 0;
            }

            aggregatedTallies.totalIntervals += Object.values(obs.studentActions || {}).reduce((a, b) => a + b, 0);
        });

        const engagementPercentages = {
            High: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.High / aggregatedTallies.totalIntervals) * 100 : 0,
            Med: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.Med / aggregatedTallies.totalIntervals) * 100 : 0,
            Low: aggregatedTallies.totalIntervals > 0 ? (aggregatedTallies.engagementLevels.Low / aggregatedTallies.totalIntervals) * 100 : 0
        };

        res.render('super_admin/copus_result3', {
            tallies: aggregatedTallies,
            engagementPercentages,
            firstName: req.session.user.firstname,
            lastName: req.session.user.lastname,
            employeeId: req.session.user.employeeId
        });
    } catch (err) {
        console.error('Error retrieving aggregated COPUS observations:', err);
        res.status(500).send('Internal Server Error');
    }
};


// User Management Controller
exports.getUserManagement = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.redirect('/login');
        }

        // Super Admin sees ALL roles including super_admin
        const employees = await User.find({});

        res.render('Super_Admin/user_management', {
            employees,
            firstName: user.firstname,
            lastName: user.lastname,
            employeeId: user.employeeId
        });
    } catch (err) {
        console.error('Error fetching user management data:', err);
        res.status(500).send('Failed to load user management view');
    }
};

// Update User Status
exports.updateUserStatus = async (req, res) => {
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

        // TODO: Send email to the user about status change

        res.status(200).send('Status updated');
    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).send('Failed to update user status');
    }
};

// Update User Details
exports.updateUser = async (req, res) => {
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
        const user = await User.findById(req.session.user.id); // This is the user performing the update
        
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
        
        // Find the user to be updated by employeeId
        const updated = await User.findOneAndUpdate(
            { employeeId: employeeId }, // Query by employeeId
            updateData, // Fields to update
            { new: true, runValidators: true } // `new: true` returns the updated doc; `runValidators: true` ensures enum validation
        );

        if (!updated) {
            req.flash('error_msg', 'Employee not found for update.');
            return res.status(404).redirect('/super_admin_user_management');
        }

        await Log.create({
            action: 'Update Employee',
            performedBy: user.id, // ID of the admin performing the update
            performedByRole: user.role,
            details: `Updated employee: ${updated.firstname} ${updated.lastname} (ID: ${updated.employeeId}), role: ${updated.role}, department: ${updated.department}.`
        });

        req.flash('success_msg', 'User updated successfully!');
        res.redirect('/super_admin_user_management');
    } catch (err) {
        console.error('Error updating user:', err);
        // More specific error handling for validation errors
        if (err.name === 'ValidationError') {
            req.flash('error_msg', `Validation Error: ${err.message}`);
        } else {
            req.flash('error_msg', 'Failed to update user. Please try again.');
        }
        res.status(500).redirect('/super_admin_user_management');
    }
};
// Create Schedule
exports.createSchedule = async (req, res) => {
    const {
        firstname,
        lastname,
        department,
        date,
        start_time,
        end_time,
        year_level,
        semester,
        subject_code,
        subject,
        observer,
        modality,
    } = req.body;

    const user = await User.findById(req.session.user.id);

    try {
        // You might want to add a check here for overlapping schedules before saving
        // using the parseDateTime helper and checking existing 'approved' schedules for the observer.

        const newSchedule = new Schedule({
            firstname,
            lastname,
            department,
            date,
            start_time,
            end_time,
            year_level,
            semester,
            subject_code,
            subject,
            observer,
            modality,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newSchedule.save();

        await Log.create({
            action: 'Create Schedule',
            performedBy: user.id,
            performedByRole: user.role,
            details: `Created a schedule for ${firstname} ${lastname} (Observer: ${observer}). Date : ${date}`
        });

        // TODO: Find the observer and the observed faculty and send an email notification

        res.redirect('/super_admin_schedule');
    } catch (err) {
        console.error('Error creating schedule:', err); // Log the actual error
        res.status(500).send('Failed to create schedule.'); // Send a proper error message
    }
};

//Super Admin
exports.getScheduleManagement = async (req, res) => {
    try {
        const currentUser = await User.findById(req.session.user.id).lean();
        if (!currentUser) {
            req.flash('error_msg', 'Unauthorized access. Please log in.');
            return res.redirect('/login');
        }

        let allSchedules;

        const baseScheduleQuery = Schedule.find()
            .sort({ date: 1, start_time: 1 })
            .populate({
                path: 'faculty_user_id',
                model: 'employee',
                select: 'firstname lastname department employeeId'
            })
            .populate({
                path: 'observers.observer_id',
                model: 'employee',
                select: 'firstname lastname role'
            });

        // Determine which schedules to fetch based on user role
        if (currentUser.role === 'super_admin') {
            allSchedules = await baseScheduleQuery.lean();
        } else if (currentUser.role === 'faculty') {
            allSchedules = await baseScheduleQuery.find({ faculty_user_id: currentUser._id }).lean();
        } else if (['Observer', 'Observer (ALC)', 'Observer (SLC)'].includes(currentUser.role)) {
            allSchedules = await baseScheduleQuery.find({
                'observers.observer_id': currentUser._id
            }).lean();
        } else {
            allSchedules = [];
            req.flash('error_msg', 'Your role does not have access to schedule management.');
            return res.redirect('/dashboard');
        }

        allSchedules = allSchedules || [];

        // Group schedules by faculty member to avoid duplicate rows
        const facultyGroups = {};
        
        allSchedules.forEach(schedule => {
            if (!schedule.faculty_user_id) return;
            
            const facultyId = schedule.faculty_user_id._id.toString();
            if (!facultyGroups[facultyId]) {
                facultyGroups[facultyId] = {
                    faculty_user_id: schedule.faculty_user_id,
                    faculty_firstname: schedule.faculty_user_id.firstname,
                    faculty_lastname: schedule.faculty_user_id.lastname,
                    faculty_department: schedule.faculty_user_id.department,
                    faculty_employee_id: schedule.faculty_user_id.employeeId,
                    faculty_subject_name: schedule.faculty_subject_name,
                    subject_type: schedule.subject_type,
                    school_year: schedule.school_year,
                    semester: schedule.semester,
                    start_time: schedule.start_time,
                    end_time: schedule.end_time,
                    copus_type: schedule.copus_type,
                    faculty_room: schedule.faculty_room,
                    status: schedule.status,
                    days: [],
                    _id: schedule._id,
                    observers: schedule.observers
                };
            }
            
            // Add day to the group
            if (schedule.day_of_week && !facultyGroups[facultyId].days.includes(schedule.day_of_week)) {
                facultyGroups[facultyId].days.push(schedule.day_of_week);
            }
        });

        // Convert groups to array and add schedule_display
        const schedulesToDisplay = Object.values(facultyGroups).map(group => {
            // Sort days in proper order
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            group.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
            
            // Create display string
            if (group.days.length === 6) {
                group.schedule_display = 'Mon - Sat';
            } else if (group.days.length > 1) {
                const shortDays = group.days.map(day => day.substring(0, 3));
                group.schedule_display = shortDays.join(', ');
            } else if (group.days.length === 1) {
                group.schedule_display = group.days[0].substring(0, 3);
            } else {
                group.schedule_display = 'No Schedule';
            }
            
            // Format observers for display
            const formattedObservers = (group.observers || []).map(obs => ({
                observer_id: obs.observer_id ? obs.observer_id._id.toString() : null,
                observer_name: obs.observer_id ? `${obs.observer_id.firstname} ${obs.observer_id.lastname}` : 'Unknown Observer',
                observer_status: obs.observer_status
            }));
            
            group.observers = formattedObservers;
            
            // Determine myStatus for current user
            const currentUserObserverEntry = (group.observers || []).find(
                obs => obs.observer_id && obs.observer_id === currentUser._id.toString()
            );
            group.myStatus = currentUserObserverEntry ? currentUserObserverEntry.observer_status : 'N/A';
            
            return group;
        });

        // Fetch all observers for the dropdown (this part remains the same)
        const allObservers = await User.find({
            $or: [
                { role: 'Observer (ALC)' },
                { role: 'Observer (SLC)' },
                { role: 'super_admin' }
            ]
        }).lean();

        // Fetch ALL observation schedules created by observers
        const ObserverSchedule = require('../model/observerSchedule');
        const observerSchedules = await ObserverSchedule.find({})
            .populate('faculty_user_id', 'firstname lastname department employeeId')
            .populate('observer_id', 'firstname lastname')
            .sort({ observation_date: 1, start_time: 1 })
            .lean();

        // Fetch COPUS observations started by the current user to determine which schedules they've started
        const CopusObservation = require('../model/copusObservation');
        const userCopusObservations = await CopusObservation.find({
            observerId: currentUser._id
        })
        .select('scheduleId copusNumber')
        .lean();

        res.render('Super_Admin/schedule', {
            facultySchedules: schedulesToDisplay,
            observerSchedules: observerSchedules || [],
            userCopusObservations: userCopusObservations || [],
            observers: allObservers,
            firstName: currentUser.firstname,
            lastName: currentUser.lastname,
            employeeId: currentUser.employeeId,
            department: currentUser.department,
            currentUser: currentUser,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (err) {
        console.error('Error fetching schedules or user data:', err);
        req.flash('error_msg', 'Failed to load schedules.');
        res.status(500).redirect('/Super_Admin_dashboard');
    }
};




// NEW: Observer (or Super Admin acting as Observer) accepts their assigned schedule slot
// The logic here is designed for a user to accept *their own* assignment.
// A Super Admin can use this if they are assigned as an observer.
exports.acceptObserverAssignment = async (req, res) => {
    try {
        const { scheduleId } = req.params; // Get schedule ID from URL parameters
        const observerUserId = req.session.user.id; // Get the ID of the logged-in user

        const observerUser = await User.findById(observerUserId);
        // Ensure only 'Observer' or 'super_admin' roles can accept assignments
        if (!observerUser || (observerUser.role !== 'observer' && observerUser.role !== 'super_admin')) {
            req.flash('error_msg', 'Unauthorized: Only designated observers can accept assignments.');
            return res.redirect('/login'); // Or a suitable unauthorized page
        }

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            req.flash('error_msg', 'Schedule not found.');
            return res.redirect('/Super_Admin_schedule'); // Redirect back to Super Admin schedules
        }

        // Find the specific entry for this observer within the schedule's observers array
        const observerEntry = schedule.observers.find(
            (obs) => obs.observer_id && obs.observer_id.toString() === observerUserId
        );

        if (!observerEntry) {
            req.flash('error_msg', 'You are not assigned to this schedule, or your assignment is not found.');
            return res.redirect('/Super_Admin_schedule');
        }

        // --- Conflict Check for Observer's Existing Accepted Schedules ---
        const newAssignmentDate = schedule.date.toISOString().split('T')[0]; //YYYY-MM-DD
        const newAssignmentStart = parseDateTime(newAssignmentDate, schedule.start_time);
        const newAssignmentEnd = parseDateTime(newAssignmentDate, schedule.end_time);

        const observerExistingSchedules = await Schedule.find({
            'observers.observer_id': observerUserId,
            date: schedule.date,
            'observers.observer_status': 'accepted',
            _id: { $ne: scheduleId }
        });

        let hasConflict = false;
        for (let existingSch of observerExistingSchedules) {
            const existingObsAssignment = existingSch.observers.find(
                (obs) => obs.observer_id.toString() === observerUserId && obs.observer_status === 'accepted'
            );

            if (existingObsAssignment) {
                const existingScheduleDate = existingSch.date.toISOString().split('T')[0];
                const existingStart = parseDateTime(existingScheduleDate, existingSch.start_time);
                const existingEnd = parseDateTime(existingScheduleDate, existingSch.end_time);

                if (newAssignmentStart < existingEnd && newAssignmentEnd > existingStart) {
                    hasConflict = true;
                    break;
                }
            }
        }

        if (hasConflict) {
            req.flash('error_msg', 'Acceptance failed: You already have an overlapping accepted schedule for this date and time.');
            return res.redirect('/Super_Admin_schedule');
        }
        // --- End Conflict Check ---

        // Update the observer's status within the schedule's array
        observerEntry.observer_status = 'accepted';
        schedule.updatedAt = new Date();

        const allAssignedObserversAccepted = schedule.observers.every(
            (obs) => obs.observer_status === 'accepted'
        );

        if (allAssignedObserversAccepted) {
            schedule.status = 'confirmed'; // All assigned observers have accepted
        }

        await schedule.save();

        await Log.create({
            action: 'Observer Accepted Assignment',
            performedBy: observerUserId,
            performedByRole: observerUser.role,
            details: `Observer ${observerUser.firstname} ${observerUser.lastname} accepted their assignment for schedule ID: ${schedule._id}. Overall schedule status: ${schedule.status}.`
        });

        req.flash('success_msg', 'Schedule assignment accepted successfully!');
        res.redirect('/Super_Admin_schedule');
    } catch (error) {
        console.error('Error accepting observer assignment:', error);
        req.flash('error_msg', 'An error occurred while accepting the assignment: ' + error.message);
        res.status(500).redirect('/Super_Admin_schedule');
    }
};

// NEW: Observer (or Super Admin acting as Observer) declines their assigned schedule slot
exports.declineObserverAssignment = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const observerUserId = req.session.user.id;

        const observerUser = await User.findById(observerUserId);
        if (!observerUser || (observerUser.role !== 'observer' && observerUser.role !== 'super_admin')) {
            req.flash('error_msg', 'Unauthorized: Only designated observers can decline assignments.');
            return res.redirect('/login');
        }

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            req.flash('error_msg', 'Schedule not found.');
            return res.redirect('/Super_Admin_schedule');
        }

        const observerEntryIndex = schedule.observers.findIndex(
            (obs) => obs.observer_id && obs.observer_id.toString() === observerUserId
        );

        if (observerEntryIndex === -1) {
            req.flash('error_msg', 'You are not assigned to this schedule, or your assignment is not found.');
            return res.redirect('/Super_Admin_schedule');
        }

        schedule.observers[observerEntryIndex].observer_status = 'declined';
        schedule.updatedAt = new Date();

        const activeObserversCount = schedule.observers.filter(
            (obs) => obs.observer_status === 'pending' || obs.observer_status === 'accepted'
        ).length;

        if (activeObserversCount === 0) {
            schedule.status = 'needs_reassignment';
        } else if (schedule.status === 'confirmed') {
            schedule.status = 'scheduled'; // Revert from confirmed if one declines
        }

        await schedule.save();

        await Log.create({
            action: 'Observer Declined Assignment',
            performedBy: observerUserId,
            performedByRole: observerUser.role,
            details: `Observer ${observerUser.firstname} ${observerUser.lastname} declined their assignment for schedule ID: ${schedule._id}. Overall schedule status: ${schedule.status}.`
        });

        req.flash('success_msg', 'Schedule assignment declined.');
        res.redirect('/Super_Admin_schedule');
    } catch (error) {
        console.error('Error declining observer assignment:', error);
        req.flash('error_msg', 'An error occurred while declining the assignment: ' + error.message);
        res.status(500).redirect('/Super_Admin_schedule');
    }
};
// Get Copus Result Overview
exports.getCopusResultOverview = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');

        console.log('🔍 Super Admin fetching dashboard data with filters...');
        
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
        const chartData = await exports.getChartData();

        // Fetch top 10 teachers based on real data
        const topTeachers = await exports.getTop10Teachers();
        
        // Build filter label for dynamic card titles
        let filterLabel = '';
        const filterParts = [];
        if (semester && semester !== 'All Semesters') filterParts.push(semester);
        if (year && year !== 'All Years') filterParts.push(year);
        if (subject && subject !== 'All Subjects') filterParts.push(subject);
        if (filterParts.length > 0) {
            filterLabel = ` (${filterParts.join(', ')})`;
        }

        res.render('Super_Admin/copus_result', {
            completedSchedules: completedSchedules,
            firstName: user.firstname,
            lastName: user.lastname,
            employeeId: user.employeeId,
            chartData: chartData,
            topTeachers: topTeachers,
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
        console.error('Error fetching dashboard data for Copus Result:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Get Copus History
exports.getCopusHistory = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.redirect('/login');
        }

        console.log('🔍 Super Admin fetching ALL COPUS results from copusresults collection...');
        
        // Fetch ALL COPUS results from copusresults collection (Super Admin can see everything)
        const copusResults = await CopusResult.find({})
            .sort({ evaluation_date: -1, submitted_at: -1 })
            .lean();

        console.log(`📊 Found ${copusResults.length} total COPUS results for Super Admin view`);

        // Fetch chart data from copusresults collection
        const chartData = await exports.getChartData();

        res.render('Super_Admin/copus_history', {
            copusResults: copusResults,
            firstName: user.firstname,
            lastName: user.lastname,
            employeeId: user.employeeId,
            chartData: chartData,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (err) {
        console.error('Error fetching completed COPUS history:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Get Approved Copus Schedules
exports.getApprovedCopusSchedules = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');

        const schedules = await Schedule.find(
            { observer: user.firstname + " " + user.lastname, status: 'approved' }
        )
            .select('firstname lastname department date start_time end_time year_level semester subject_code subject observer copus modality ');

        res.render('Super_Admin/copus', {
            schedules: schedules,
            firstName: user.firstname,
            lastName: user.lastname,
            employeeId: user.employeeId
        });
    } catch (err) {
        console.error('Error fetching approved schedules:', err);
        res.status(500).send('Internal Server Error');
    }
};

// Get Settings Page
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.redirect('/login');
        }

        res.render('Super_Admin/setting', {
            firstName: user.firstname,
            lastName: user.lastname,
            employeeId: user.employeeId,
            currentUser: user
        });
    } catch (err) {
        console.error('Error fetching user data for settings page:', err);
        res.status(500).send('Failed to load Settings view');
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
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

        let logDetails = 'Super Admin updated own profile. Changes: ';
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
};

// Get Logs
exports.getLogs = async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 });
        res.render('Super_Admin/logs', { logs });
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).send('Failed to load logs');
    }
};

// Add Employee
exports.addEmployee = async (req, res) => {
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
        // Check user's role and validate allowed roles accordingly
        const userRole = req.session.user.role;
        
        let allowedRoles;
        if (userRole === 'super_admin') {
            allowedRoles = ['admin', 'Faculty', 'Observer (ALC)', 'Observer (SLC)'];
        } else if (userRole === 'admin') {
            allowedRoles = ['Faculty', 'Observer (ALC)', 'Observer (SLC)'];
        } else {
            return res.status(403).json({ error: 'You do not have permission to create users.' });
        }
        
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ error: 'You do not have permission to create this role.' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
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
                pass: 'ugpc lsxi pmro bwno' // Updated app password
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
                  </div>
                  
                  <div style="margin: 20px 0; background-color: #ffffff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
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
        console.error('Error adding user or sending email:', err); // More specific error log
        // Handle specific errors like duplicate key if email or employeeId is unique
        if (err.code === 11000) { // MongoDB duplicate key error
            return res.status(400).json({ error: 'User with this email or employee ID already exists.' });
        }
        res.status(500).json({ error: 'Failed to add user or send email due to a server error.' });
    }
};

// Helper function to get chart data
// Get Top 10 Teachers based on average of student and teacher action percentages
// Ranking is PER SUBJECT, but NO DUPLICATE TEACHERS (only highest-ranked subject per teacher)
exports.getTop10Teachers = async function() {
    try {
        console.log('🏆 Calculating Top 10 Teachers (Per Subject, No Duplicates) based on real COPUS results...');

        // Fetch all COPUS results with percentage data
        const allResults = await CopusResult.find({
            student_action_percentage: { $exists: true, $ne: null },
            teacher_action_percentage: { $exists: true, $ne: null }
        })
        .select('faculty_name faculty_department subject_name year semester student_action_percentage teacher_action_percentage calculated_overall_percentage')
        .lean();

        console.log(`📊 Found ${allResults.length} COPUS results with percentage data`);

        if (allResults.length === 0) {
            return [];
        }

        // Group results by faculty name AND subject (so each subject is ranked separately)
        const facultySubjectMap = {};

        allResults.forEach(result => {
            // Use subject_name from the schema (not subject)
            const subject = result.subject_name || 'Unknown Subject';
            const facultyKey = `${result.faculty_name}|||${subject}`; // Use ||| as separator
            
            if (!facultySubjectMap[facultyKey]) {
                facultySubjectMap[facultyKey] = {
                    faculty_name: result.faculty_name,
                    department: result.faculty_department || 'N/A',
                    subject: subject,
                    results: [],
                    semesters: new Set(),
                    years: new Set()
                };
            }

            facultySubjectMap[facultyKey].results.push({
                student_action_percentage: result.student_action_percentage,
                teacher_action_percentage: result.teacher_action_percentage,
                calculated_overall_percentage: result.calculated_overall_percentage,
                semester: result.semester,
                year: result.year
            });

            // Track unique semesters and years for this faculty-subject combination
            if (result.semester) facultySubjectMap[facultyKey].semesters.add(result.semester);
            if (result.year) facultySubjectMap[facultyKey].years.add(result.year);
        });

        // Calculate averages for each faculty-subject combination
        const facultySubjectAverages = Object.values(facultySubjectMap).map(entry => {
            const numResults = entry.results.length;
            
            const avgStudentAction = entry.results.reduce((sum, r) => sum + (r.student_action_percentage || 0), 0) / numResults;
            const avgTeacherAction = entry.results.reduce((sum, r) => sum + (r.teacher_action_percentage || 0), 0) / numResults;
            const avgOverall = entry.results.reduce((sum, r) => sum + (r.calculated_overall_percentage || 0), 0) / numResults;

            // Get most recent semester and year
            const mostRecentSemester = Array.from(entry.semesters).sort().pop() || 'N/A';
            const mostRecentYear = Array.from(entry.years).sort().pop() || 'N/A';

            return {
                faculty_name: entry.faculty_name,
                department: entry.department,
                subject: entry.subject,
                semester: mostRecentSemester,
                year: mostRecentYear,
                student_action_avg: Math.round(avgStudentAction * 100) / 100,
                teacher_action_avg: Math.round(avgTeacherAction * 100) / 100,
                overall_avg: Math.round(avgOverall * 100) / 100,
                num_observations: numResults,
                // Combined average for ranking (student + teacher) / 2
                combined_avg: Math.round(((avgStudentAction + avgTeacherAction) / 2) * 100) / 100
            };
        });

        // Sort by combined average (descending) first
        const sortedFacultySubjects = facultySubjectAverages
            .sort((a, b) => b.combined_avg - a.combined_avg);

        // Filter to get unique teachers (no duplicates) - keep only the highest-ranked subject per teacher
        const seenTeachers = new Set();
        const top10UniqueTeachers = [];

        for (const entry of sortedFacultySubjects) {
            if (!seenTeachers.has(entry.faculty_name)) {
                top10UniqueTeachers.push(entry);
                seenTeachers.add(entry.faculty_name);
                
                if (top10UniqueTeachers.length >= 10) {
                    break;
                }
            }
        }

        console.log(`🏅 Top 10 Unique Teachers (best subject per teacher):`, 
            top10UniqueTeachers.map(t => `${t.faculty_name} (${t.subject}): ${t.combined_avg}%`));

        return top10UniqueTeachers;

    } catch (error) {
        console.error('Error calculating Top 10 Teachers:', error);
        return [];
    }
};

exports.getChartData = async function() {
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
        console.error('Error fetching top performers:', error);
        return {
            topHighest: [],
            topLowest: [],
            topOverall: null
        };
    }
};

// Approve observer schedule (Super Admin)
exports.approveObserverSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = await User.findById(req.session.user.id);
        
        if (!currentUser) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Only Super Admin can approve
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have permission to approve schedules' 
            });
        }

        const ObserverSchedule = require('../model/observerSchedule');
        const schedule = await ObserverSchedule.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { status: 'approved' },
            { new: true }
        );

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found or already processed' });
        }

        console.log(`Super Admin ${currentUser.firstname} ${currentUser.lastname} approved schedule ${id}`);
        res.json({ success: true, message: 'Observation schedule approved successfully!' });

    } catch (err) {
        console.error('Error approving schedule:', err);
        res.status(500).json({ success: false, message: 'Failed to approve schedule.' });
    }
};

// Disapprove observer schedule (Super Admin)
exports.disapproveObserverSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = await User.findById(req.session.user.id);
        
        if (!currentUser) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Only Super Admin can disapprove
        if (currentUser.role !== 'super_admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have permission to disapprove schedules' 
            });
        }

        const ObserverSchedule = require('../model/observerSchedule');
        const schedule = await ObserverSchedule.findOneAndUpdate(
            { _id: id, status: 'pending' },
            { status: 'disapproved' },
            { new: true }
        );

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found or already processed' });
        }

        console.log(`Super Admin ${currentUser.firstname} ${currentUser.lastname} disapproved schedule ${id}`);
        res.json({ success: true, message: 'Observation schedule disapproved.' });

    } catch (err) {
        console.error('Error disapproving schedule:', err);
        res.status(500).json({ success: false, message: 'Failed to disapprove schedule.' });
    }
};

// GET /super_admin_copus_appointments - View all appointments
exports.getCopusAppointments = async (req, res) => {
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

        res.render('Super_Admin/copus_appointments', {
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
        res.redirect('/super_admin_dashboard');
    }
};

// DELETE /super_admin_delete_appointment/:id - Delete an appointment
exports.deleteAppointment = async (req, res) => {
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
            details: `Super Admin ${user.firstname} ${user.lastname} deleted appointment ${id}`,
            timestamp: new Date()
        });

        res.json({ success: true, message: 'Appointment deleted successfully!' });

    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the appointment.' });
    }
};