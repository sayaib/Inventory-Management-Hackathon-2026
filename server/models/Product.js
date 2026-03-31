const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  location: {
    type: String,
    default: 'Main Warehouse'
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
