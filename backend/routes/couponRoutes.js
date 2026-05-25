const express = require('express');
const router = express.Router();
const { applyCoupon } = require('../controllers/couponController');
const { getDiscountRules } = require('../controllers/discountRuleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyCoupon);
router.get('/rules', getDiscountRules);

module.exports = router;
