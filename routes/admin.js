const express = require('express');
const controller = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/login', controller.loginPage);
router.post('/login', controller.login);
router.get('/logout', controller.logout);

router.get('/', requireAdmin, controller.dashboard);

router.get('/settings', requireAdmin, controller.settingsPage);
router.post('/settings', requireAdmin, controller.saveSettingsPage);

router.get('/sliders', requireAdmin, controller.slidersPage);
router.post('/sliders', requireAdmin, controller.saveSlidersPage);

router.get('/markets', requireAdmin, controller.marketsPage);
router.post('/markets', requireAdmin, controller.saveMarketsPage);

router.get('/results', requireAdmin, controller.resultsPage);
router.post('/results', requireAdmin, controller.saveResultsPage);

router.get('/admins', requireAdmin, controller.adminsPage);
router.post('/admins', requireAdmin, controller.saveAdminsPage);

module.exports = router;
