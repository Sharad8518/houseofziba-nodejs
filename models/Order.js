const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema(
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
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { timestamps: false }
);

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
    },

    billingAddress: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String, default: "India" },
    },

    payment: {
      method: { type: String, enum: ["COD", "CARD", "UPI", "NETBANKING"], required: true },
      status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
      transactionId: { type: String }, // Razorpay/Stripe/PayPal txn id
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },

    tracking: {
      courierName: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },

    invoiceNumber: { type: String, unique: true, sparse: true },

    /* Totals */
    totalItems: { type: Number, required: true },
    totalMrp: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    /* For returns/exchanges */
    returnPolicy: {
      isReturnable: { type: Boolean, default: true },
      returnWindowDays: { type: Number, default: 7 },
    },

    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
