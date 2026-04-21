const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  addToWishlist,
  removeFromWishlist,
  getUsers,
  deleteUser,
  toggleBlockUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, admin, getUsers);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/wishlist/:id').post(protect, addToWishlist).delete(protect, removeFromWishlist);

// Admin user management
router.route('/:id').delete(protect, admin, deleteUser);
router.route('/:id/block').put(protect, admin, toggleBlockUser);

module.exports = router;
