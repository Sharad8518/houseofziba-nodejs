
const Order = require("../models/Order")
const Product = require("../models/Product")
const Cart = require("../models/Cart")


const placeOrder = async (req, res) => {
  try {
    const userId = req.ID;
    const { 
      buyNow,            // true if single product checkout
      productId,         // only for buy now
      variant,           // { sku, color, size, price, mrp, discount }
      quantity,          // only for buy now
      shippingAddress,
      paymentMethod 
    } = req.body;

    let items = [];
    let totalItems = 0, totalMrp = 0, totalDiscount = 0, totalAmount = 0;

    if (buyNow) {
      // 🛒 Case 1: Direct Buy Now
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const subtotal = variant.price * quantity;
      totalItems = quantity;
      totalMrp = variant.mrp * quantity;
      totalDiscount = (variant.mrp - variant.price) * quantity;
      totalAmount = subtotal;

      items.push({
        product: product._id,
        variant,
        quantity,
        subtotal,
      });

    } else {
      // 🛒 Case 2: Checkout from Cart
      const cart = await Cart.findOne({ user: userId }).populate("items.product");
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      items = cart.items.map(item => ({
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

module.exports = {
  placeOrder,
 updateOrderStatus
};
