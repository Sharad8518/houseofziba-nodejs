const mongoose = require("mongoose");
const { Schema } = mongoose;

const favoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Who favorited
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true }, // Which product
  },
  { timestamps: true }
);

// Prevent duplicate entries (same user cannot favorite same product twice)
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
