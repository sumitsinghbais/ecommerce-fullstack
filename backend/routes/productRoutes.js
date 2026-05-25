const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  deleteProductReview,
  bulkUploadProducts,
  deleteProductsBulk,
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getProducts)
  .post(protect, admin, upload.single('image'), createProduct);

router.route('/bulk')
  .post(protect, admin, bulkUploadProducts)
  .delete(protect, admin, deleteProductsBulk);

router.route('/:id')
  .get(getProductById)
  .put(protect, admin, upload.single('image'), updateProduct)
  .delete(protect, admin, deleteProduct);

router.route('/:id/reviews')
  .post(protect, createProductReview)
  .delete(protect, deleteProductReview);


module.exports = router;
