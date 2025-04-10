const Product = require('../models/product.model');
const { validationResult } = require('express-validator');
const slugify = require('slugify');

// Get all products with filtering and pagination
exports.getAllProducts = async (req, res) => {
  try {
    const {
      keyword,
      categoryId,
      vendorId,
      minPrice,
      maxPrice,
      status,
      sort,
      page,
      limit
    } = req.query;

    const result = await Product.search({
      keyword,
      categoryId,
      vendorId,
      minPrice,
      maxPrice,
      status,
      sort,
      page,
      limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findBySlug(req.params.slug);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get related products
    const relatedProducts = await Product.getRelatedProducts(
      product.id,
      product.categoryId
    );

    res.json({
      product,
      relatedProducts
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create product (Vendor only)
exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      price,
      comparePrice,
      categoryId,
      stock,
      images,
      specifications
    } = req.body;

    // Generate slug from name
    const slug = slugify(name, { lower: true, strict: true });
    
    // Check if slug already exists
    const existingProduct = await Product.findBySlug(slug);
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const product = new Product({
      name,
      slug,
      description,
      price,
      comparePrice,
      categoryId,
      vendorId: req.user.userId,
      stock,
      images,
      specifications
    });

    const productId = await product.save();
    
    res.status(201).json({
      message: 'Product created successfully',
      productId
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update product (Vendor only)
exports.updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      name,
      description,
      price,
      comparePrice,
      categoryId,
      stock,
      images,
      specifications
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is the vendor of this product
    if (product.vendorId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate new slug if name changed
    let slug = product.slug;
    if (name && name !== product.name) {
      slug = slugify(name, { lower: true, strict: true });
      
      // Check if new slug already exists
      const existingProduct = await Product.findBySlug(slug);
      if (existingProduct && existingProduct.id !== parseInt(id)) {
        return res.status(400).json({ message: 'Product with this name already exists' });
      }
    }

    const updatedProduct = {
      name: name || product.name,
      slug,
      description: description || product.description,
      price: price || product.price,
      comparePrice: comparePrice || product.comparePrice,
      categoryId: categoryId || product.categoryId,
      stock: stock || product.stock,
      images: images || product.images,
      specifications: specifications || product.specifications,
      status: 'pending' // Reset status for admin review
    };

    const success = await Product.update(id, updatedProduct);
    
    if (success) {
      res.json({ message: 'Product updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update product' });
    }

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete product (Vendor/Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is the vendor of this product
    if (product.vendorId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    try {
      const success = await Product.delete(id);
      if (success) {
        res.json({ message: 'Product deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete product' });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update product status (Admin only)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['pending', 'active', 'inactive', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProduct = {
      ...product,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null
    };

    const success = await Product.update(id, updatedProduct);
    
    if (success) {
      // TODO: Send notification to vendor
      res.json({ message: 'Product status updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update product status' });
    }

  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get vendor products
exports.getVendorProducts = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const vendorId = req.params.vendorId || req.user.userId;

    // Check if user has permission to view these products
    if (vendorId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await Product.getVendorProducts(vendorId, {
      status,
      page,
      limit
    });

    res.json(result);

  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update product stock
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is the vendor of this product
    if (product.vendorId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate new stock quantity
    if (product.stock + quantity < 0) {
      return res.status(400).json({ message: 'Invalid stock quantity' });
    }

    const success = await Product.updateStock(id, quantity);
    
    if (success) {
      res.json({ message: 'Product stock updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update product stock' });
    }

  } catch (error) {
    console.error('Update product stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 