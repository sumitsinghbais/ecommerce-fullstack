const mongoose = require('mongoose');

const discountRuleSchema = new mongoose.Schema({
  minQuantity: {
    type: Number,
    required: true,
    unique: true, // Only one rule per quantity threshold
    min: 1
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.models.DiscountRule || mongoose.model('DiscountRule', discountRuleSchema);
