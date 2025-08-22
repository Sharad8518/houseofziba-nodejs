const mongoose = require("mongoose");
const { Schema } = mongoose;

// Cart Item Schema
const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      sku: { type: String, required: true },  // Unique identifier for the variant
      attributes: [
        {
          name: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
      price: { type: Number, required: true },
      mrp: { type: Number, },
      discount: { type: Number, default: 0 }, // % discount
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    subtotal: {
      type: Number, // quantity * price
      required: true,
    },
  },
  { timestamps: true }
);

// Cart Schema
const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [cartItemSchema],

    totalItems: { type: Number, default: 0 },   // total quantity
    totalPrice: { type: Number, default: 0 },   // sum of all subtotals
    totalMrp: { type: Number, default: 0 },     // original sum (before discount)
    totalDiscount: { type: Number, default: 0 }, // total saved

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-calculate totals before saving
cartSchema.pre("save", function (next) {
  let totalItems = 0;
  let totalPrice = 0;
  let totalMrp = 0;

  this.items.forEach((item) => {
    totalItems += item.quantity;
    totalPrice += item.subtotal;
    totalMrp += item.mrp * item.quantity;
  });

  this.totalItems = totalItems;
  this.totalPrice = totalPrice;
  this.totalMrp = totalMrp;
  this.totalDiscount = totalMrp - totalPrice;

  next();
});

module.exports = mongoose.model("Cart", cartSchema);
