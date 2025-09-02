const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: {
      sku: { type: String, required: true },
      attributes: [
        {
          name: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
      paddingDetails: {
        waist: { type: Number, trim: true },
        length: { type: Number, trim: true },
        height: { type: Number, trim: true },
        unit: { type: String, default: "cm" },
      },
      price: { type: Number, required: true },
      mrp: { type: Number },
      discount: { type: Number, default: 0 },
      paddingDetails: {
        waist: { type: String, trim: true },
        length: { type: String, trim: true },
        height: { type: String, trim: true },
        unit: { type: String, default: "cm" },
      },
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
      method: {
        type: String,
        enum: ["COD", "CARD", "UPI", "NETBANKING","ONLINE"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded","created"],
        default: "pending",
      },
      razorpayOrderId :{ type: String },
      transactionId: { type: String },
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
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

    returnPolicy: {
      isReturnable: { type: Boolean, default: true },
      returnWindowDays: { type: Number, default: 7 },
    },

    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: generate invoiceNumber if missing
 */
orderSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // count orders for today to make invoice unique
    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);

    const orderCount = await mongoose.model("Order").countDocuments({
      placedAt: { $gte: startOfDay, $lt: endOfDay },
    });

    this.invoiceNumber = `ORD-${year}${month}${day}-${orderCount + 1}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
