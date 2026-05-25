const DiscountRule = require('../models/DiscountRule');

// @desc    Get all discount rules (Admin/User)
// @route   GET /api/admin/discount-rules
// @access  Private/Admin
exports.getDiscountRules = async (req, res) => {
  try {
    const rules = await DiscountRule.find({}).sort({ minQuantity: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a discount rule (Admin)
// @route   POST /api/admin/discount-rules
// @access  Private/Admin
exports.createDiscountRule = async (req, res) => {
  try {
    const { minQuantity, discountPercentage } = req.body;
    
    const exists = await DiscountRule.findOne({ minQuantity });
    if (exists) return res.status(400).json({ message: 'A rule for this quantity already exists' });

    const rule = await DiscountRule.create({ minQuantity, discountPercentage });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a discount rule (Admin)
// @route   PUT /api/admin/discount-rules/:id
// @access  Private/Admin
exports.updateDiscountRule = async (req, res) => {
  try {
    const rule = await DiscountRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    Object.assign(rule, req.body);
    const updated = await rule.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a discount rule (Admin)
// @route   DELETE /api/admin/discount-rules/:id
// @access  Private/Admin
exports.deleteDiscountRule = async (req, res) => {
  try {
    const rule = await DiscountRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    await rule.deleteOne();
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
