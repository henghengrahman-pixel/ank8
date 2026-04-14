const express = require('express');
const controller = require('../controllers/siteController');
const router = express.Router();

router.get('/', controller.home);
router.get('/prediksi', controller.predictions);
router.get('/prediksi/:slug', controller.predictionDetail);
router.get('/result/:slug', controller.resultDetail);

module.exports = router;
