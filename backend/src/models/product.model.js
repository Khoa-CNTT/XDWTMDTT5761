const db = require('../config/database');

class Product {
  constructor(product) {
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.price = product.price;
    this.comparePrice = product.comparePrice;
    this.categoryId = product.categoryId;
    this.vendorId = product.vendorId;
    this.stock = product.stock || 0;
    this.images = product.images;
    this.specifications = product.specifications;
    this.status = product.status || 'pending'; // pending, active, inactive, rejected
    this.rejectionReason = product.rejectionReason;
    this.isPromoted = product.isPromoted || false;
    this.averageRating = product.averageRating || 0;
    this.reviewCount = product.reviewCount || 0;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT p.*, 
        c.name as categoryName,
        u.fullName as vendorName,
        u.email as vendorEmail
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN users u ON p.vendorId = u.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute(
      `SELECT p.*, 
        c.name as categoryName,
        u.fullName as vendorName,
        u.email as vendorEmail
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN users u ON p.vendorId = u.id
       WHERE p.slug = ?`,
      [slug]
    );
    return rows[0];
  }

  static async search(options = {}) {
    const {
      keyword = '',
      categoryId,
      vendorId,
      minPrice,
      maxPrice,
      status,
      sort = 'newest',
      page = 1,
      limit = 10
    } = options;

    let query = `SELECT p.*, 
                  c.name as categoryName,
                  u.fullName as vendorName
                FROM products p
                LEFT JOIN categories c ON p.categoryId = c.id
                LEFT JOIN users u ON p.vendorId = u.id
                WHERE 1=1`;
    
    const params = [];

    if (keyword) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (categoryId) {
      query += ` AND p.categoryId = ?`;
      params.push(categoryId);
    }

    if (vendorId) {
      query += ` AND p.vendorId = ?`;
      params.push(vendorId);
    }

    if (minPrice) {
      query += ` AND p.price >= ?`;
      params.push(minPrice);
    }

    if (maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(maxPrice);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'rating':
        query += ` ORDER BY p.averageRating DESC`;
        break;
      case 'popularity':
        query += ` ORDER BY p.reviewCount DESC`;
        break;
      default:
        query += ` ORDER BY p.createdAt DESC`;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // Get total count
    const [countResult] = await db.execute(
      query.replace(/SELECT p\.\*[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM'),
      params.slice(0, -2)
    );
    const total = countResult[0].total;

    // Get paginated results
    const [rows] = await db.execute(query, params);

    return {
      products: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async save() {
    const sql = `INSERT INTO products (
      name, slug, description, price, comparePrice, categoryId, 
      vendorId, stock, images, specifications, status, isPromoted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.execute(sql, [
      this.name,
      this.slug,
      this.description,
      this.price,
      this.comparePrice,
      this.categoryId,
      this.vendorId,
      this.stock,
      JSON.stringify(this.images),
      JSON.stringify(this.specifications),
      this.status,
      this.isPromoted
    ]);

    return result.insertId;
  }

  static async update(id, product) {
    const sql = `UPDATE products SET
      name = ?, slug = ?, description = ?, price = ?, 
      comparePrice = ?, categoryId = ?, stock = ?, 
      images = ?, specifications = ?, status = ?,
      isPromoted = ?, rejectionReason = ?
      WHERE id = ?`;

    const [result] = await db.execute(sql, [
      product.name,
      product.slug,
      product.description,
      product.price,
      product.comparePrice,
      product.categoryId,
      product.stock,
      JSON.stringify(product.images),
      JSON.stringify(product.specifications),
      product.status,
      product.isPromoted,
      product.rejectionReason,
      id
    ]);

    return result.affectedRows > 0;
  }

  static async updateStock(id, quantity) {
    const [result] = await db.execute(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [quantity, id]
    );
    return result.affectedRows > 0;
  }

  static async updateRating(id) {
    const [ratings] = await db.execute(
      `SELECT AVG(rating) as avgRating, COUNT(*) as count 
       FROM reviews WHERE productId = ?`,
      [id]
    );

    if (ratings[0].count > 0) {
      await db.execute(
        `UPDATE products 
         SET averageRating = ?, reviewCount = ?
         WHERE id = ?`,
        [ratings[0].avgRating, ratings[0].count, id]
      );
    }
  }

  static async delete(id) {
    // Check if product has any orders
    const [orders] = await db.execute(
      'SELECT COUNT(*) as count FROM order_items WHERE productId = ?',
      [id]
    );

    if (orders[0].count > 0) {
      throw new Error('Cannot delete product with existing orders');
    }

    const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getVendorProducts(vendorId, options = {}) {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM products WHERE vendorId = ?';
    const params = [vendorId];

    if (status) {
      query += ' AND status = ?';
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
      products: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getRelatedProducts(productId, categoryId, limit = 4) {
    const [rows] = await db.execute(
      `SELECT * FROM products 
       WHERE categoryId = ? AND id != ? AND status = 'active'
       ORDER BY RAND() LIMIT ?`,
      [categoryId, productId, limit]
    );
    return rows;
  }
}

module.exports = Product; 