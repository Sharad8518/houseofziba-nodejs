const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const createRazorpayOrderInstance = async (amount) => {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const options = {
    amount: amount * 100, // smallest currency unit (paise)
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  return await instance.orders.create(options);
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.ID;
    const { buyNow, productId, variant, quantity, shippingAddress, paymentMethod } = req.body;
    console.log('paymentMethod',paymentMethod)

    let items = [];
    let totalAmount = 0;
    let totalMrp = 0;

    if (buyNow) {
      const product = await Product.findById(productId);
      const price = Number(variant?.price) || 0;
      const mrp = Number(variant?.mrp) || price; // fallback
      const qty = Number(quantity) || 1;
      const subtotal = price * qty;
      
       totalItems = qty;
       totalMrp = mrp * qty; // <-- THIS LINE
      //  totalDiscount = (mrp - price) * qty;
      totalAmount = subtotal;

      items.push({
        product: product._id,
        variant,
        quantity: qty,
        subtotal: totalAmount,
      });
    } else {
      const cart = await Cart.findOne({ user: userId }).populate("items.product");
      if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

      items = cart.items.map((item) => ({
        product: item.product._id,
        variant: item.variant,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));
      totalAmount = cart.totalPrice;

      // Clear cart
      cart.items = [];
      cart.totalItems = 0;
      cart.totalPrice = 0;
      cart.totalDiscount = 0;
      cart.totalMrp = 0;
      await cart.save();
    }

    // Shipping fee
    const shippingFee = totalAmount >= 999 ? 0 : 50;
    const grandTotal = totalAmount + shippingFee;

    let orderData = {
      user: userId,
      items,
      shippingAddress,
      payment: {
        method: paymentMethod,
        status: paymentMethod === "COD" ? "pending" : "created",
      },
      totalItems: items.reduce((acc, i) => acc + i.quantity, 0),
      totalAmount: grandTotal,
      totalMrp,
      shippingFee,
    };

    const order = await Order.create(orderData);

    // If payment is online, create Razorpay order
    if (paymentMethod === "ONLINE") {
      const razorpayOrder = await createRazorpayOrderInstance(grandTotal);
      // Save razorpayOrderId to order for verification later
      order.payment.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.json({ success: true, order, razorpayOrder });
    }

    // COD order
    res.json({ success: true, order });

  } catch (error) {
    console.error("Place Order Error:", error);
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
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Find order by razorpayOrderId
    const order = await Order.findOne({ "payment.razorpayOrderId": razorpayOrderId });
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

    const { search, orderNumber, orderStatus } = req.query;

    // 🔎 Build filter object
    let filter = {};

    // ✅ Search by customer name or email (case-insensitive)
    if (search) {
      filter.$or = [
        { "user.name": { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Filter by order number (assuming stored as "orderNumber" field)
    if (orderNumber) {
      filter.orderNumber = { $regex: orderNumber, $options: "i" };
    }

    // ✅ Filter by order status
    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    // 📊 Get total
    const totalOrders = await Order.countDocuments(filter);

    // 📦 Fetch orders
    const orders = await Order.find(filter)
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
      totalPages: Math.ceil(totalOrders / limit),
      orders,
    });
  } catch (error) {
    console.error("Get Orders Error", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};


module.exports = {
  placeOrder,
  updateOrderStatus,
  verifyRazorpayPayment,
  getUserOrder,
  getAllOrder
};
