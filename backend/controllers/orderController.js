const mongoose = require('mongoose');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const DiscountRule = require('../models/DiscountRule');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      couponCode, // Optional
    } = req.body;

    // 1. Input Validation
    if (!orderItems || orderItems.length === 0) {
      res.status(400).json({ message: 'No order items' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode || !shippingAddress.country) {
      res.status(400).json({ message: 'Full shipping address is required' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // 2. Process items and calculate prices
    let subtotal = 0;
    let totalQuantity = 0;
    const finalOrderItems = [];

    for (const item of orderItems) {
      if (!item.product) {
        res.status(400).json({ message: 'Valid product ID is required for each item' });
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const product = await Product.findById(item.product).session(session);
      
      if (!product) {
        res.status(400).json({ message: `Product not found: ${item.product}` });
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // Check stock availability (using 'stock' as per model, but logic as requested)
      if (product.stock < item.quantity) {
        res.status(400).json({ 
          message: `Product ${product.name} out of stock` 
        });
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // Reduce stock
      product.stock -= item.quantity;
      await product.save({ session });
      
      const itemPrice = product.price; // Always use current product price for safety
      subtotal += itemPrice * item.quantity;
      totalQuantity += item.quantity;

      finalOrderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        imageUrl: product.imageUrl || ''
      });
    }

    // 3. Calculate Bulk Discount (Auto Apply)
    let bulkDiscount = 0;
    const activeRules = await DiscountRule.find({ isActive: true }).sort({ minQuantity: -1 }).session(session);
    const applicableRule = activeRules.find(rule => totalQuantity >= rule.minQuantity);
    
    if (applicableRule) {
      bulkDiscount = (subtotal * applicableRule.discountPercentage) / 100;
    }

    // Amount after bulk discount
    const amountAfterBulk = subtotal - bulkDiscount;

    // 4. Handle Coupon
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true }).session(session);
      if (appliedCoupon) {
        const now = new Date();
        const isExpired = now > new Date(appliedCoupon.expiryDate);
        const limitReached = appliedCoupon.usedCount >= appliedCoupon.usageLimit;
        const lowCart = amountAfterBulk < appliedCoupon.minOrderAmount;

        if (!isExpired && !limitReached && !lowCart) {
          if (appliedCoupon.discountType === 'percentage') {
            couponDiscount = (amountAfterBulk * appliedCoupon.discountValue) / 100;
            if (appliedCoupon.maxDiscount > 0 && couponDiscount > appliedCoupon.maxDiscount) {
              couponDiscount = appliedCoupon.maxDiscount;
            }
          } else {
            couponDiscount = appliedCoupon.discountValue;
          }
          
          // Increment used count
          appliedCoupon.usedCount += 1;
          await appliedCoupon.save({ session });
        }
      }
    }

    // Final calculations
    const shippingPrice = amountAfterBulk > 100 ? 0 : 10;
    const taxPrice = Number((0.05 * (amountAfterBulk - couponDiscount)).toFixed(2));
    const totalPrice = Number((amountAfterBulk - couponDiscount + shippingPrice + taxPrice).toFixed(2));

    const order = new Order({
      orderItems: finalOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod: paymentMethod || 'Mock',
      itemsPrice: Number(subtotal.toFixed(2)),
      shippingPrice,
      taxPrice,
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      couponDiscount: Number(couponDiscount.toFixed(2)),
      bulkDiscount: Number(bulkDiscount.toFixed(2)),
      totalPrice,
    });

    const createdOrder = await order.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json(createdOrder);
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        // Ignore abort errors if transaction wasn't started
      }
      session.endSession();
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Safe ownership check
    const orderUser = order.user;
    if (!orderUser) {
      return res.status(404).json({ message: 'Order user not found' });
    }

    const orderUserId = orderUser._id ? orderUser._id.toString() : orderUser.toString();
    const isOwner = orderUserId === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (isAdmin || isOwner) {
      const populatedOrder = await Order.findById(req.params.id).populate('user', 'name email');
      res.json(populatedOrder);
    } else {
      res.status(403).json({ message: 'Not authorized to view this order' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { id, status, update_time, email_address } = req.body;

    // Handle payment failure logic explicitly as requested
    if (status && typeof status === 'string' && status.toLowerCase() === 'failed') {
      return res.status(200).json({
        success: false,
        message: 'Payment failed'
      });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = { id, status, update_time, email_address };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status: newStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Workflow validation
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      return res.status(400).json({ 
        message: `Order is already ${order.status.toLowerCase()} and cannot be changed.` 
      });
    }

    const validTransitions = {
      'Pending': ['Shipped', 'Cancelled'],
      'Shipped': ['Delivered'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${order.status} to ${newStatus}.` 
      });
    }

    order.status = newStatus;
    if (newStatus === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders with optional filter
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    const statusFilter = req.query.status ? { status: req.query.status } : {};
    
    let dateFilter = {};
    if (req.query.startDate && req.query.endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate)
        }
      };
    }

    const orders = await Order.find({
      ...statusFilter,
      ...dateFilter
    }).populate('user', 'id name email');
    
    res.json(orders || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  getMyOrders,
  getOrders,
};
