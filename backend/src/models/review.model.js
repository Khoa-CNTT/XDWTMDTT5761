const db = require('../config/database');

class Review {
  constructor(review) {
    this.userId = review.userId;
    this.productId = review.productId;
    this.orderId = review.orderId;
    this.rating = review.rating;
    this.comment = review.comment;
    this.images = review.images || [];
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT r.*, 
        u.fullName as userName,
        p.name as productName
       FROM reviews r
       LEFT JOIN users u ON r.userId = u.id
       LEFT JOIN products p ON r.productId = p.id
       WHERE r.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByProductId(productId, options = {}) {
    const { rating, sort = 'newest', page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = `SELECT r.*, 
                  u.fullName as userName,
                  u.email as userEmail
                FROM reviews r
                LEFT JOIN users u ON r.userId = u.id
                WHERE r.productId = ?`;
    
    const params = [productId];

    if (rating) {
      query += ` AND r.rating = ?`;
      params.push(rating);
    }

    // Get total count
    const [countResult] = await db.execute(
      query.replace(/SELECT r\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params
    );
    const total = countResult[0].total;

    // Sorting
    query += sort === 'highest' ? ` ORDER BY r.rating DESC` :
             sort === 'lowest' ? ` ORDER BY r.rating ASC` :
             ` ORDER BY r.createdAt DESC`;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);

    return {
      reviews: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = `SELECT r.*, 
                  p.name as productName,
                  p.slug as productSlug,
                  p.images as productImages
                FROM reviews r
                LEFT JOIN products p ON r.productId = p.id
                WHERE r.userId = ?`;
    
    const params = [userId];

    // Get total count
    const [countResult] = await db.execute(
      query.replace(/SELECT r\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params
    );
    const total = countResult[0].total;

    // Pagination
    query += ` ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);

    return {
      reviews: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async save() {
    const sql = `INSERT INTO reviews (
      userId, productId, orderId, rating, comment, images
    ) VALUES (?, ?, ?, ?, ?, ?)`;

    const [result] = await db.execute(sql, [
      this.userId,
      this.productId,
      this.orderId,
      this.rating,
      this.comment,
      JSON.stringify(this.images)
    ]);

    // Update product rating
    await db.execute(
      `UPDATE products p
       SET averageRating = (
         SELECT AVG(rating) 
         FROM reviews 
         WHERE productId = ?
       ),
       reviewCount = (
         SELECT COUNT(*) 
         FROM reviews 
         WHERE productId = ?
       )
       WHERE p.id = ?`,
      [this.productId, this.productId, this.productId]
    );

    return result.insertId;
  }

  static async update(id, review) {
    const sql = `UPDATE reviews SET
      rating = ?, comment = ?, images = ?
      WHERE id = ?`;

    const [result] = await db.execute(sql, [
      review.rating,
      review.comment,
      JSON.stringify(review.images),
      id
    ]);

    if (result.affectedRows > 0) {
      const [reviewData] = await db.execute(
        'SELECT productId FROM reviews WHERE id = ?',
        [id]
      );

      // Update product rating
      await db.execute(
        `UPDATE products p
         SET averageRating = (
           SELECT AVG(rating) 
           FROM reviews 
           WHERE productId = ?
         )
         WHERE p.id = ?`,
        [reviewData[0].productId, reviewData[0].productId]
      );
    }

    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [reviewData] = await db.execute(
      'SELECT productId FROM reviews WHERE id = ?',
      [id]
    );

    const [result] = await db.execute('DELETE FROM reviews WHERE id = ?', [id]);

    if (result.affectedRows > 0 && reviewData[0]) {
      // Update product rating
      await db.execute(
        `UPDATE products p
         SET averageRating = COALESCE(
           (SELECT AVG(rating) FROM reviews WHERE productId = ?),
           0
         ),
         reviewCount = (
           SELECT COUNT(*) FROM reviews WHERE productId = ?
         )
         WHERE p.id = ?`,
        [reviewData[0].productId, reviewData[0].productId, reviewData[0].productId]
      );
    }

    return result.affectedRows > 0;
  }

  static async checkUserPurchased(userId, productId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count
       FROM orders o
       JOIN order_items oi ON o.id = oi.orderId
       WHERE o.userId = ? AND oi.productId = ? AND o.status = 'delivered'`,
      [userId, productId]
    );
    return rows[0].count > 0;
  }

  static async checkUserReviewed(userId, productId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM reviews WHERE userId = ? AND productId = ?',
      [userId, productId]
    );
    return rows[0].count > 0;
  }
}

module.exports = Review; 