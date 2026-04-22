const express = require('express');
const router = express.Router();
const {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUploadProducts,
} = require('../../controllers/productController');
const { protect, admin } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/uploadMiddleware');

// Dedicated Admin APIs for Product Management
router.post('/products', protect, admin, upload.single('image'), createProduct);
router.post('/products/bulk', protect, admin, bulkUploadProducts);
router.put('/products/:id', protect, admin, upload.single('image'), updateProduct);
router.delete('/products/:id', protect, admin, deleteProduct);

module.exports = router;
