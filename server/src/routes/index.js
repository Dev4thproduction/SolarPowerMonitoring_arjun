const express = require('express');
const router = express.Router();

const siteController = require('../controllers/siteController');
const buildGenerationController = require('../controllers/buildGenerationController');
const dailyGenerationController = require('../controllers/dailyGenerationController');
const dashboardController = require('../controllers/dashboardController');

const validate = require('../middleware/validate');
const { createSiteSchema, updateSiteSchema } = require('../schemas/siteSchema');
const { buildGenerationSchema, dailyGenerationSchema } = require('../schemas/generationSchema');

// Site Routes
router.get('/sites', siteController.getAllSites);
router.post('/sites', validate(createSiteSchema), siteController.createSite);
router.put('/sites/:id', validate(updateSiteSchema), siteController.updateSite);
router.delete('/sites/:id', siteController.deleteSite);

// Build Generation Routes
router.get('/build-generation/:siteId', buildGenerationController.getBuildGeneration);
router.post('/build-generation', validate(buildGenerationSchema), buildGenerationController.createOrUpdateBuildGeneration);

// Daily Generation Routes
router.get('/daily-generation/:siteId', dailyGenerationController.getDailyGeneration);
router.post('/daily-generation', validate(dailyGenerationSchema), dailyGenerationController.addDailyGeneration);

// Dashboard Routes
router.get('/dashboard', dashboardController.getDashboardData);

module.exports = router;
