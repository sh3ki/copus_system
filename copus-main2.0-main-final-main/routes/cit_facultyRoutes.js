const express = require('express');
const router = express.Router();
const citFacultyController = require('../controllers/cit_facultyController');

// **CRITICAL FIXES:**
// 1. Use object destructuring to import both middleware functions.
// 2. We assume `isFaculty` is also in the same `auth.js` file now.
const { isAuthenticated, isFaculty } = require('../middleware/auth');

// CIT Faculty Pages
router.get('/CIT_Faculty_dashboard', isAuthenticated, isFaculty, citFacultyController.getDashboard);

// COPUS Result Listing
router.get('/CIT_Faculty_copus_result', isAuthenticated, isFaculty, citFacultyController.getCopusResultList);

// New COPUS Evaluation Result View
router.get('/CIT_Faculty_evaluation_result/:scheduleId', isAuthenticated, isFaculty, citFacultyController.getEvaluationResult);

// Specific COPUS Result Views (expecting scheduleId in URL)
router.get('/CIT_Faculty_copus_result1/:scheduleId', isAuthenticated, isFaculty, citFacultyController.getCopusResult1);
router.get('/CIT_Faculty_copus_result2/:scheduleId', isAuthenticated, isFaculty, citFacultyController.getCopusResult2);
router.get('/CIT_Faculty_copus_result3/:scheduleId', isAuthenticated, isFaculty, citFacultyController.getCopusResult3);

// COPUS Observation Saving Routes
router.post('/CIT_Faculty_copus_result1', isAuthenticated, isFaculty, citFacultyController.saveCopusResult1);
router.post('/CIT_Faculty_copus_result2', isAuthenticated, isFaculty, citFacultyController.saveCopusResult2);
router.post('/CIT_Faculty_copus_result3', isAuthenticated, isFaculty, citFacultyController.saveCopusResult3);

// COPUS History & Summary
router.get('/CIT_Faculty_copus_history', isAuthenticated, isFaculty, citFacultyController.getCopusHistory);
router.get('/CIT_Faculty_evaluation_details/:id', isAuthenticated, isFaculty, citFacultyController.getEvaluationDetails);
router.get('/CIT_Faculty_copus_summary', isAuthenticated, isFaculty, citFacultyController.getCopusSummary);

router.get('/CIT_Faculty_schedule_management', isAuthenticated, isFaculty, citFacultyController.getFacultySchedules);
router.get('/CIT_Faculty_available_schedule', isAuthenticated, isFaculty, citFacultyController.getAvailableSchedule);
router.delete('/delete_faculty_schedule/:id', isAuthenticated, isFaculty, citFacultyController.deleteFacultySchedule);

// COPUS Appointments
router.get('/CIT_Faculty_copus_appointments', isAuthenticated, isFaculty, citFacultyController.getCopusAppointments);
router.post('/faculty_create_appointment', isAuthenticated, isFaculty, citFacultyController.createAppointment);
router.put('/faculty_update_appointment/:id', isAuthenticated, isFaculty, citFacultyController.updateAppointment);
router.delete('/faculty_delete_appointment/:id', isAuthenticated, isFaculty, citFacultyController.deleteAppointment);

// Settings
router.get('/CIT_Faculty_setting', isAuthenticated, isFaculty, citFacultyController.getSetting);

module.exports = router;