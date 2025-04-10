const { Configuration, OpenAIApi } = require('openai');
const Product = require('../models/product.model');
const Category = require('../models/category.model');

class ChatbotService {
  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.openai = new OpenAIApi(configuration);
  }

  async generateResponse(message, context = {}) {
    try {
      // Get relevant product information
      let productInfo = '';
      if (context.productId) {
        const product = await Product.findById(context.productId);
        if (product) {
          productInfo = `
            Product: ${product.name}
            Price: $${product.price}
            Description: ${product.description}
            Stock: ${product.stock} units available
          `;
        }
      }

      // Get category information if needed
      let categoryInfo = '';
      if (context.categoryId) {
        const category = await Category.findById(context.categoryId);
        if (category) {
          categoryInfo = `Category: ${category.name}\n${category.description}`;
        }
      }

      // Prepare system message
      const systemMessage = `You are a helpful e-commerce assistant. Your role is to help customers with:
        - Product information and recommendations
        - Shopping assistance
        - Order and shipping inquiries
        - General customer support
        
        Current context:
        ${productInfo}
        ${categoryInfo}
        
        Please provide clear, concise, and helpful responses.`;

      const completion = await this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7,
        presence_penalty: 0.6
      });

      return completion.data.choices[0].message.content;

    } catch (error) {
      console.error('Chatbot error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async searchProducts(query) {
    try {
      // Use embeddings to find relevant products
      const embedding = await this.openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: query
      });

      // Here you would typically use the embedding to search your product database
      // For now, we'll just use a simple keyword search
      const products = await Product.search({
        keyword: query,
        limit: 5
      });

      return products;

    } catch (error) {
      console.error('Product search error:', error);
      throw new Error('Failed to search products');
    }
  }

  async generateProductRecommendations(userId, productId) {
    try {
      // Get user's purchase history and preferences
      // This would be implemented based on your user data model
      
      // Get product details
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get related products
      const recommendations = await Product.getRelatedProducts(
        productId,
        product.categoryId,
        5
      );

      return recommendations;

    } catch (error) {
      console.error('Recommendations error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  async handleOrderInquiry(orderId) {
    // This would be implemented based on your order tracking system
    return 'Please check your order status in your account dashboard.';
  }

  async handleShippingInquiry(location) {
    // This would be implemented based on your shipping service integration
    return 'We offer standard shipping (3-5 business days) and express shipping (1-2 business days).';
  }
}

module.exports = new ChatbotService(); 