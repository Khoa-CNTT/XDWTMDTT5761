const db = require('../config/database');

class Coupon {
  constructor(coupon) {
    this.code = coupon.code.toUpperCase();
    this.type = coupon.type;
    this.value = coupon.value;
    this.minPurchase = coupon.minPurchase;
    this.maxDiscount = coupon.maxDiscount;
    this.startDate = coupon.startDate;
    this.endDate = coupon.endDate;
    this.usageLimit = coupon.usageLimit;
    this.status = coupon.status || 'active';
  }

  static async findByCode(code) {
    const [rows] = await db.execute(
      'SELECT * FROM coupons WHERE code = ? AND status = "active"',
      [code.toUpperCase()]
    );
    return rows[0];
  }

  static async getAllCoupons(options = {}) {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM coupons';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await db.execute(
      query.replace('SELECT *', 'SELECT COUNT(*) as total'),
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);

    return {
      coupons: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async save() {
    // Check if code already exists
    const existingCoupon = await Coupon.findByCode(this.code);
    if (existingCoupon) {
      throw new Error('Coupon code already exists');
    }

    const [result] = await db.execute(
      `INSERT INTO coupons (
        code, type, value, minPurchase, maxDiscount,
        startDate, endDate, usageLimit, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.code,
        this.type,
        this.value,
        this.minPurchase,
        this.maxDiscount,
        this.startDate,
        this.endDate,
        this.usageLimit,
        this.status
      ]
    );
    return result.insertId;
  }

  static async update(id, coupon) {
    const [result] = await db.execute(
      `UPDATE coupons SET
        type = ?, value = ?, minPurchase = ?, maxDiscount = ?,
        startDate = ?, endDate = ?, usageLimit = ?, status = ?
       WHERE id = ?`,
      [
        coupon.type,
        coupon.value,
        coupon.minPurchase,
        coupon.maxDiscount,
        coupon.startDate,
        coupon.endDate,
        coupon.usageLimit,
        coupon.status,
        id
      ]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM coupons WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async validateCoupon(code, totalAmount) {
    const coupon = await this.findByCode(code);
    
    if (!coupon) {
      throw new Error('Invalid coupon code');
    }

    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (now < startDate) {
      throw new Error('Coupon is not active yet');
    }

    if (now > endDate) {
      throw new Error('Coupon has expired');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    if (coupon.minPurchase && totalAmount < coupon.minPurchase) {
      throw new Error(`Minimum purchase amount is ${coupon.minPurchase}`);
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (totalAmount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return {
      couponId: coupon.id,
      discount
    };
  }

  static async incrementUsage(id) {
    await db.execute(
      'UPDATE coupons SET usageCount = usageCount + 1 WHERE id = ?',
      [id]
    );
  }
}

module.exports = Coupon; 