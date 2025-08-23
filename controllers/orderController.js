const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const placeOrder = async (req, res) => {
  try {
    const userId = req.ID;
    const {
      buyNow, // true if single product checkout
      productId, // only for buy now
      variant, // { sku, color, size, price, mrp, discount }
      quantity, // only for buy now
      shippingAddress,
      paymentMethod,
    } = req.body;

    let items = [];
    let totalItems = 0,
      totalMrp = 0,
      totalDiscount = 0,
      totalAmount = 0;

    if (buyNow) {
      // 🛒 Case 1: Direct Buy Now
      const product = await Product.findById(productId);
      if (!product)
        return res.status(404).json({ message: "Product not found" });
      const price = Number(variant?.price) || 0;
      const mrp = Number(variant?.mrp) || price; // fallback to price if missing
      const qty = Number(quantity) || 1;
      const subtotal = price * qty;
      totalItems = qty;
      totalMrp = mrp * qty;
      // totalDiscount = (variant.mrp - variant.price) * quantity;
      totalAmount = subtotal;

      items.push({
        product: product._id,
        variant,
        quantity,
        subtotal,
      });
    } else {
      // 🛒 Case 2: Checkout from Cart
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.product"
      );
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      items = cart.items.map((item) => ({
        product: item.product._id,
        variant: item.variant,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      totalItems = cart.totalItems;
      totalMrp = cart.totalMrp;
      totalDiscount = cart.totalDiscount;
      totalAmount = cart.totalPrice;

      // Clear cart after order
      cart.items = [];
      cart.totalItems = 0;
      cart.totalPrice = 0;
      cart.totalDiscount = 0;
      cart.totalMrp = 0;
      await cart.save();
    }

    // 🚚 Shipping Fee logic
    let shippingFee = totalAmount >= 999 ? 0 : 50;

    // 📦 Create Order
    const order = new Order({
      user: userId,
      items,
      shippingAddress,
      payment: {
        method: paymentMethod,
        status: paymentMethod === "COD" ? "pending" : "pending",
      },
      totalItems,
      totalMrp,
      totalDiscount,
      shippingFee,
      totalAmount: totalAmount + shippingFee,
    });

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.error("Place Order Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    if (status === "shipped") order.tracking.shippedAt = new Date();
    if (status === "delivered") order.tracking.deliveredAt = new Date();

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    // Payment is valid, update order status
    const order = await Order.findOne({
      "payment.transactionId": razorpayOrderId,
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.payment.status = "paid";
    order.payment.transactionId = razorpayPaymentId;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Payment Verification Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserOrder = async (req, res) => {
  try {
    const userId = req.ID;

    // Get pagination params from query (default page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Count total orders
    const totalOrders = await Order.countDocuments({ user: userId });

    // Fetch paginated orders
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit)
      .populate("items.product", "title media salePrice") 
      .populate("user", "name email phone");

    res.json({
      success: true,
      totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit),
      orders,
    });
  } catch (error) {
    console.error("Get Orders by User Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

const getAllOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.product", "title media salePrice")
      .populate("user", "name email phone");

    res.json({
      success: true,
      totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit), // corrected
      orders
    });
  } catch (error) {
    console.error("Get Orders Error", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
};


module.exports = {
  placeOrder,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getUserOrder,
  getAllOrder
};
