const express = require('express');
const router = express.Router();
const {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUploadProducts,
} = require('../../controllers/productController');
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../../controllers/couponController');
const {
  getDiscountRules,
  createDiscountRule,
  updateDiscountRule,
  deleteDiscountRule,
} = require('../../controllers/discountRuleController');
const { protect, admin } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');

// Dedicated Admin APIs for Product Management
router.post('/products', protect, admin, upload.single('image'), createProduct);
router.post('/products/bulk', protect, admin, bulkUploadProducts);
router.put('/products/:id', protect, admin, upload.single('image'), updateProduct);
router.delete('/products/:id', protect, admin, deleteProduct);

// Coupon Management
router.get('/coupons', protect, admin, getCoupons);
router.post('/coupons', protect, admin, createCoupon);
router.put('/coupons/:id', protect, admin, updateCoupon);
router.delete('/coupons/:id', protect, admin, deleteCoupon);

// Discount Rule Management
router.get('/discount-rules', protect, admin, getDiscountRules);
router.post('/discount-rules', protect, admin, createDiscountRule);
router.put('/discount-rules/:id', protect, admin, updateDiscountRule);
router.delete('/discount-rules/:id', protect, admin, deleteDiscountRule);

module.exports = router;
