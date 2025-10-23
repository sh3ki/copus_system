const express = require('express');
const router = express.Router();
const observerController = require('../controllers/observerController'); 

// **CRITICAL FIX:** Correct the import to use destructuring
const { isAuthenticated } = require('../middleware/auth'); 

// Observer Dashboard
router.get('/Observer_dashboard', isAuthenticated, observerController.getDashboard);

// Appointment Scheduling
router.post('/observer_schedule_appointment', isAuthenticated, observerController.scheduleAppointment);

// Notifications API
router.get('/api/notifications', isAuthenticated, observerController.getNotifications);
router.post('/api/notifications/mark-read', isAuthenticated, observerController.markNotificationsRead);

// Schedule Management
router.get('/Observer_schedule_management', isAuthenticated, observerController.getScheduleManagement);

// New Observer Schedule CRUD Operations
router.post('/observer/create-schedule', isAuthenticated, observerController.createObserverSchedule);
router.post('/observer/schedule/:id/start', isAuthenticated, observerController.markScheduleInProgress);
router.post('/observer/schedule/:id/complete', isAuthenticated, observerController.markScheduleCompleted);
router.post('/observer/schedule/:id/cancel', isAuthenticated, observerController.cancelSchedule);
router.post('/observer/schedule/:id/approve', isAuthenticated, observerController.approveSchedule);
router.post('/observer/schedule/:id/disapprove', isAuthenticated, observerController.disapproveSchedule);
router.post('/observer/schedule/:id/start-copus', isAuthenticated, observerController.startCopusObservation);

// Legacy routes (keep for backward compatibility)
router.post('/observer/schedule/complete/:id', isAuthenticated, observerController.completeSchedule);
router.post('/observer/schedule/:scheduleId/accept', isAuthenticated, observerController.acceptSchedule);
router.post('/observer/schedule/:scheduleId/decline', isAuthenticated, observerController.declineSchedule);

// COPUS Observation Flow
router.get('/observer_copus', isAuthenticated, observerController.getApprovedCopusSchedules); // List of approved schedules for observation

router.get('/observer_copus_start_copus1/:scheduleId', isAuthenticated, observerController.startCopus1Observation);
router.get('/observer_copus_start_copus2/:scheduleId', isAuthenticated, observerController.startCopus2Observation);
router.get('/observer_copus_start_copus3/:scheduleId', isAuthenticated, observerController.startCopus3Observation);

// New COPUS Evaluation Routes
router.get('/observer_copus_evaluate/:scheduleId', isAuthenticated, observerController.getCopusEvaluationForm);
router.post('/observer/submit-copus-evaluation', isAuthenticated, observerController.submitCopusEvaluation);
router.post('/observer/save-copus-draft', isAuthenticated, observerController.saveCopusDraft);

// Saving COPUS Data (POST requests) - These are already correct for API submission
router.post('/observer_copus_result1', isAuthenticated, observerController.saveCopus1Observation);
router.post('/observer_copus_result2', isAuthenticated, observerController.saveCopus2Observation);
router.post('/observer_copus_result3', isAuthenticated, observerController.saveCopus3Observation);

// Auto-save observation progress
router.post('/observer/copus-observation/:id/save-progress', isAuthenticated, observerController.saveObservationProgress);

// Displaying COPUS Results (GET requests)
router.get('/observer_copus_result', isAuthenticated, observerController.getCopusResultList); // List of completed schedules to view results

// *** CRITICAL CHANGES HERE ***
// These routes now accept observationId as a query parameter (from copus_start.js redirect)
// AND as a path parameter (from copus_result.ejs "VIEW RESULT" buttons).
// This requires a modification in the respective getCopusXResult controllers to check both.
router.get('/observer_copus_result1', isAuthenticated, observerController.getCopus1Result); // For redirect from submission (query param)
router.get('/observer_copus_result1/:observationId', isAuthenticated, observerController.getCopus1Result); // For "VIEW RESULT" button (path param)

router.get('/observer_copus_result2', isAuthenticated, observerController.getCopus2Result);
router.get('/observer_copus_result2/:observationId', isAuthenticated, observerController.getCopus2Result); // Add similar for Copus 2/3

router.get('/observer_copus_result3', isAuthenticated, observerController.getCopus3Result);
router.get('/observer_copus_result3/:observationId', isAuthenticated, observerController.getCopus3Result); // Add similar for Copus 2/3

// COPUS History & Summary
router.get('/Observer_copus_history', isAuthenticated, observerController.getCopusHistory);
router.get('/observer_copus_summary', isAuthenticated, observerController.getCopusSummary);

// PDF Download Route
router.get('/observer/download-copus-pdf/:resultId', isAuthenticated, observerController.downloadCopusPDF);

// Excel Download Route
router.get('/observer/download-copus-excel/:resultId', isAuthenticated, observerController.downloadCopusExcel);

// COPUS Appointments
router.get('/Observer_copus_appointments', isAuthenticated, observerController.getCopusAppointments);
router.put('/observer_respond_appointment/:id', isAuthenticated, observerController.respondToAppointment);
router.delete('/observer_delete_appointment/:id', isAuthenticated, observerController.deleteAppointment);

// Settings
router.get('/observer_setting', isAuthenticated, observerController.getSetting);

module.exports = router;