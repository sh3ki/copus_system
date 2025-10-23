// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); 
const { isAuthenticated } = require('../middleware/auth'); 
const multer = require('multer');
const path = require('path'); // <-- ADD THIS LINE
const FacultySchedule = require('../model/facultySchedule');

// Configure Multer to use disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Make sure the 'uploads/' directory exists in your project root
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // You can change the naming logic here if you want
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Admin Pages
router.get('/admin_dashboard', isAuthenticated, adminController.getAdminDashboard);
router.get('/admin_user_management', isAuthenticated, adminController.getUserManagement);
router.post('/admin_update_user_status', isAuthenticated, adminController.updateUserStatus);
router.post('/admin_update_user', isAuthenticated, adminController.updateUser);
router.post('/add_employee', isAuthenticated, adminController.addEmployee);
router.get('/admin_schedule', isAuthenticated, adminController.getAdminSchedule);

// New route for creating a schedule with a single file upload
router.post('/admin_schedule/create', isAuthenticated, upload.single('schedule_image'), adminController.createSchedule);

// New route for bulk schedule creation
router.post('/admin_schedule/create_bulk', isAuthenticated, adminController.createBulkSchedule);

// New routes for schedule management
router.post('/admin_schedule/update', isAuthenticated, adminController.updateSchedule);
router.post('/admin_schedule/delete', isAuthenticated, adminController.deleteSchedule);

// Other admin views
router.get('/admin_copus_result', isAuthenticated, adminController.getCopusResult);
router.get('/admin_copus_history', isAuthenticated, adminController.getCopusHistory);
router.get('/admin_setting', isAuthenticated, adminController.getSetting);
router.post('/admin_update_profile', isAuthenticated, adminController.updateProfile);

// COPUS Appointments
router.get('/admin_copus_appointments', isAuthenticated, adminController.getCopusAppointments);
router.delete('/admin_delete_appointment/:id', isAuthenticated, adminController.deleteAppointment);

module.exports = router;