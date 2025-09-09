const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    header: { type: mongoose.Schema.Types.ObjectId, ref: "Header", required: true },
    name: { type: String, required: true },
    image: { type: String,required: true},
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);