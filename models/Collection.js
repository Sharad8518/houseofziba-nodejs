const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String,required: true},
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);
