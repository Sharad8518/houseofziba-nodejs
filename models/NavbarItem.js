// models/NavbarItem.js
const mongoose = require('mongoose');

const SubcategorySchema = new mongoose.Schema({
  label: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 }
}, { _id: false }); // Disable separate _id for sub-items

const NavbarItemSchema = new mongoose.Schema({
  label: { type: String, required: true }, // Main category name
  url: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
  subcategories: [SubcategorySchema], // Array of subcategory objects
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('NavbarItem', NavbarItemSchema);
