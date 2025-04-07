const db = require('../config/database');

class Category {
  constructor(category) {
    this.name = category.name;
    this.slug = category.slug;
    this.description = category.description;
    this.image = category.image;
    this.parentId = category.parentId || null;
    this.status = category.status || 'active';
    this.order = category.order || 0;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
  }

  static async findBySlug(slug) {
    const [rows] = await db.execute('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0];
  }

  static async findAll(options = {}) {
    const { parentId = null, status = 'active', includeInactive = false } = options;
    
    let query = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    if (parentId !== undefined) {
      query += ' AND parentId = ?';
      params.push(parentId);
    }

    if (!includeInactive) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY `order` ASC, name ASC';
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async findWithChildren(parentId = null) {
    const [rows] = await db.execute(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM categories WHERE parentId = c.id) as childCount
       FROM categories c
       WHERE c.parentId = ?
       ORDER BY c.order ASC, c.name ASC`,
      [parentId]
    );
    return rows;
  }

  async save() {
    const sql = `INSERT INTO categories (name, slug, description, image, parentId, status, \`order\`) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.execute(sql, [
      this.name,
      this.slug,
      this.description,
      this.image,
      this.parentId,
      this.status,
      this.order
    ]);

    return result.insertId;
  }

  static async update(id, category) {
    const sql = `UPDATE categories 
                 SET name = ?, slug = ?, description = ?, image = ?, 
                     parentId = ?, status = ?, \`order\` = ?
                 WHERE id = ?`;
    
    const [result] = await db.execute(sql, [
      category.name,
      category.slug,
      category.description,
      category.image,
      category.parentId,
      category.status,
      category.order,
      id
    ]);

    return result.affectedRows > 0;
  }

  static async delete(id) {
    // Check if category has children
    const [children] = await db.execute(
      'SELECT COUNT(*) as count FROM categories WHERE parentId = ?',
      [id]
    );

    if (children[0].count > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    // Check if category has products
    const [products] = await db.execute(
      'SELECT COUNT(*) as count FROM products WHERE categoryId = ?',
      [id]
    );

    if (products[0].count > 0) {
      throw new Error('Cannot delete category with products');
    }

    const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async updateOrder(id, order) {
    const [result] = await db.execute(
      'UPDATE categories SET `order` = ? WHERE id = ?',
      [order, id]
    );
    return result.affectedRows > 0;
  }

  static async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE categories SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Category; 