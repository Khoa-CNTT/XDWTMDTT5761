const Coupon = require('../models/coupon.model');
const { validationResult } = require('express-validator');

// Get all coupons (Admin only)
exports.getAllCoupons = async (req, res) => {
  try {
    const { status, page, limit } = req.query;

    const result = await Coupon.getAllCoupons({
      status,
      page,
      limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create coupon (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const coupon = new Coupon(req.body);
    
    try {
      const couponId = await coupon.save();
      res.status(201).json({
        message: 'Coupon created successfully',
        couponId
      });
    } catch (error) {
      if (error.message === 'Coupon code already exists') {
        res.status(400).json({ message: error.message });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update coupon (Admin only)
exports.updateCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const success = await Coupon.update(id, req.body);

    if (success) {
      res.json({ message: 'Coupon updated successfully' });
    } else {
      res.status(404).json({ message: 'Coupon not found' });
    }

  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete coupon (Admin only)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Coupon.delete(id);

    if (success) {
      res.json({ message: 'Coupon deleted successfully' });
    } else {
      res.status(404).json({ message: 'Coupon not found' });
    }

  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Validate coupon
exports.validateCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, totalAmount } = req.body;

    try {
      const result = await Coupon.validateCoupon(code, totalAmount);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }

  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 