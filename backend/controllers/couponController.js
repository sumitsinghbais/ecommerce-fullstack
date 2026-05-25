const Coupon = require('../models/Coupon');

// @desc    Get all coupons (Admin)
// @route   GET /api/admin/coupons
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a coupon (Admin)
// @route   POST /api/admin/coupons
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxDiscount, expiryDate, usageLimit } = req.body;
    
    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) return res.status(400).json({ message: 'Coupon code already exists' });

    const coupon = await Coupon.create({
      code, discountType, discountValue, minOrderAmount, maxDiscount, expiryDate, usageLimit
    });

    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a coupon (Admin)
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    Object.assign(coupon, req.body);
    const updated = await coupon.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a coupon (Admin)
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Apply a coupon (User)
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) return res.status(400).json({ message: 'Invalid or inactive coupon code' });

    // Validations
    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    if (cartAmount < coupon.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order of $${coupon.minOrderAmount} required` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cartAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      success: true,
      code: coupon.code,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
