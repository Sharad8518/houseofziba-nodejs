// models/FrequentlyBoughtTogether.js
const mongoose = require("mongoose");

const FBTItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  images: [
    {
      url: { type: String, required: true },
      alt: { type: String },
      kind: { type: String, enum: ["image", "video"], default: "image" },
      bytes: { type: Number },
    }
  ], // array of URLs
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  status: { 
    type: String, 
    enum: ["ACTIVE", "INACTIVE"], 
    default: "ACTIVE" 
  },
}, { timestamps: true });

module.exports = mongoose.model("FrequentlyBoughtTogether", FBTItemSchema);
