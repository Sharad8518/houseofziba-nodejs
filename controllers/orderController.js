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

    let items = [];
    let totalAmount = 0;
    let totalMrp = 0;

    if (buyNow) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const price = Number(variant?.price) || 0;
      const mrp = Number(variant?.mrp) || price;
      const qty = Number(quantity) || 1;

      // ✅ Jewellery: decrease from product.quantity
      if (product.productType === "Jewellery") {
        if (product.quantity < qty) {
          return res.status(400).json({ message: "Insufficient stock" });
        }
        product.quantity -= qty;
      }

      // ✅ Cloths: decrease from matching variant stock
      if (product.productType === "Cloths") {
        const variantToUpdate = product.variants.find(v => v.size === variant.size);
        if (!variantToUpdate) {
          return res.status(400).json({ message: "Variant not found" });
        }
        if (variantToUpdate.stock < qty) {
          return res.status(400).json({ message: `Only ${variantToUpdate.stock} left for size ${variant.size}` });
        }
        variantToUpdate.stock -= qty;
      }

      await product.save();

      const subtotal = price * qty;
      totalMrp = mrp * qty;
      totalAmount = subtotal;

      items.push({
        product: product._id,
        variant,
        quantity: qty,
        subtotal,
      });

    } else {
      const cart = await Cart.findOne({ user: userId }).populate("items.product");
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      items = [];

      for (const item of cart.items) {
        const product = item.product;
        const qty = item.quantity;

        // ✅ Jewellery stock check
        if (product.productType === "Jewellery") {
          if (product.quantity < qty) {
            return res.status(400).json({ message: `${product.title} has only ${product.quantity} left` });
          }
          product.quantity -= qty;
        }

        // ✅ Cloths stock check
        if (product.productType === "Cloths") {
          const variantToUpdate = product.variants.find(v => v.size === item.variant.size);
          if (!variantToUpdate) {
            return res.status(400).json({ message: `Variant ${item.variant.size} not found for ${product.title}` });
          }
          if (variantToUpdate.stock < qty) {
            return res.status(400).json({ message: `${product.title} (size ${item.variant.size}) has only ${variantToUpdate.stock} left` });
          }
          variantToUpdate.stock -= qty;
        }

        await product.save();

        items.push({
          product: product._id,
          variant: item.variant,
          quantity: qty,
          subtotal: item.subtotal,
        });
      }

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

    // Online payment (Razorpay)
    if (paymentMethod === "ONLINE") {
      const razorpayOrder = await createRazorpayOrderInstance(grandTotal);
      order.payment.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.json({ success: true, order, razorpayOrder });
    }

    // COD
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


 const currentMonthSale = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          placedAt: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    res.json({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalSales: result.length ? result[0].totalSales : 0,
      totalOrders: result.length ? result[0].totalOrders : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --- Get total stock sold (delivered orders only)
const stockSold = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          placedAt: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalStockSold: { $sum: "$items.quantity" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    res.json({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalStockSold: result.length ? result[0].totalStockSold : 0,
      totalOrders: result.length ? result[0].totalOrders : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const pieChart = async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const result = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          placedAt: { $gte: startOfYear, $lt: endOfYear },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$placedAt" } },
          totalSales: { $sum: "$totalAmount" },
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Map month numbers → names
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Build chart data
    const chartData = result.map((r) => {
      const netRevenue = r.totalSales - r.totalDiscount;
      return {
        name: monthNames[r._id.month - 1],
        totalSales: r.totalSales,
        discount: r.totalDiscount,
        netRevenue: netRevenue < 0 ? 0 : netRevenue,
        value: netRevenue < 0 ? 0 : netRevenue, // for PieChart `dataKey="value"`
      };
    });

    res.json({
      year: now.getFullYear(),
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const lineChart = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await Order.aggregate([
      {
        $match: {
          orderStatus: "delivered",
          placedAt: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$placedAt" } },
          totalSales: { $sum: "$totalAmount" },
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    // Build data for LineChart
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const chartData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const found = result.find((r) => r._id.day === day);
      chartData.push({
        day,
        totalSales: found ? found.totalSales : 0,
        discount: found ? found.totalDiscount : 0,
        netRevenue: found ? Math.max(found.totalSales - found.totalDiscount, 0) : 0,
      });
    }

    res.json({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  placeOrder,
  updateOrderStatus,
  verifyRazorpayPayment,
  getUserOrder,
  getAllOrder,
  currentMonthSale,
  stockSold,
  pieChart,
  lineChart
};
