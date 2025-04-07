const Category = require('../models/category.model');
const { validationResult } = require('express-validator');
const slugify = require('slugify');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { parentId, status, includeInactive } = req.query;
    
    const options = {
      parentId: parentId === 'null' ? null : parentId,
      status,
      includeInactive: includeInactive === 'true'
    };

    const categories = await Category.findAll(options);
    res.json(categories);

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findBySlug(req.params.slug);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get category tree
exports.getCategoryTree = async (req, res) => {
  try {
    const { parentId = null } = req.query;
    const categories = await Category.findWithChildren(parentId);
    res.json(categories);

  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, image, parentId, order } = req.body;
    
    // Generate slug from name
    const slug = slugify(name, { lower: true, strict: true });
    
    // Check if slug already exists
    const existingCategory = await Category.findBySlug(slug);
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      name,
      slug,
      description,
      image,
      parentId: parentId === 'null' ? null : parentId,
      order
    });

    const categoryId = await category.save();
    
    res.status(201).json({
      message: 'Category created successfully',
      categoryId
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, image, parentId, order, status } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Generate new slug if name changed
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = slugify(name, { lower: true, strict: true });
      
      // Check if new slug already exists
      const existingCategory = await Category.findBySlug(slug);
      if (existingCategory && existingCategory.id !== parseInt(id)) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
    }

    const updatedCategory = {
      name: name || category.name,
      slug,
      description: description || category.description,
      image: image || category.image,
      parentId: parentId === 'null' ? null : (parentId || category.parentId),
      order: order || category.order,
      status: status || category.status
    };

    const success = await Category.update(id, updatedCategory);
    
    if (success) {
      res.json({ message: 'Category updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update category' });
    }

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    try {
      const success = await Category.delete(id);
      if (success) {
        res.json({ message: 'Category deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete category' });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update category order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const success = await Category.updateOrder(id, order);
    
    if (success) {
      res.json({ message: 'Category order updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update category order' });
    }

  } catch (error) {
    console.error('Update category order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update category status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const success = await Category.updateStatus(id, status);
    
    if (success) {
      res.json({ message: 'Category status updated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to update category status' });
    }

  } catch (error) {
    console.error('Update category status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 