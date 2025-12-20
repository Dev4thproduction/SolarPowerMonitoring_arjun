const express = require('express');
const router = express.Router();

const siteController = require('../controllers/siteController');
const buildGenerationController = require('../controllers/buildGenerationController');
const dailyGenerationController = require('../controllers/dailyGenerationController');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');

const { protect, restrictTo } = require('../middleware/auth');

const validate = require('../middleware/validate');
const { createSiteSchema, updateSiteSchema } = require('../schemas/siteSchema');
const { buildGenerationSchema, dailyGenerationSchema } = require('../schemas/generationSchema');

// Auth Routes
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// Site Routes
router.get('/sites', protect, siteController.getAllSites);
router.post('/sites', protect, restrictTo('ADMIN'), validate(createSiteSchema), siteController.createSite);
router.put('/sites/:id', protect, restrictTo('ADMIN'), validate(updateSiteSchema), siteController.updateSite);
router.delete('/sites/:id', protect, restrictTo('ADMIN'), siteController.deleteSite);

// Build Generation Routes
router.get('/build-generation/:siteId', protect, buildGenerationController.getBuildGeneration);
router.post('/build-generation', protect, restrictTo('ADMIN', 'OPERATOR'), validate(buildGenerationSchema), buildGenerationController.createOrUpdateBuildGeneration);

// Daily Generation Routes
router.get('/daily-generation/:siteId', protect, dailyGenerationController.getDailyGeneration);
router.post('/daily-generation', protect, restrictTo('ADMIN', 'OPERATOR'), validate(dailyGenerationSchema), dailyGenerationController.addDailyGeneration);
router.put('/daily-generation/:id', protect, restrictTo('ADMIN', 'OPERATOR'), dailyGenerationController.updateDailyGeneration);
router.delete('/daily-generation/:id', protect, restrictTo('ADMIN', 'OPERATOR'), dailyGenerationController.deleteDailyGeneration);

// Dashboard Routes
router.get('/dashboard', protect, dashboardController.getDashboardData);

// Alert Routes
router.get('/alerts', protect, dashboardController.getActiveAlerts);
router.patch('/alerts/:id/resolve', protect, restrictTo('ADMIN', 'OPERATOR'), dashboardController.resolveAlert);

module.exports = router;
