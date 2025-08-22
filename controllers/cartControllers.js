const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add to Cart
const addToCart = async (req, res) => {
  try {
    const { productId, sku, quantity } = req.body;
    const userId = req.ID;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.sku === sku);
    if (!variant) return res.status(400).json({ message: "Invalid variant" });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const existingItem = cart.items.find((item) => item.variant.sku === sku);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * variant.price;
    } else {
      cart.items.push({
        product: productId,
        variant: {
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          mrp: variant.mrp,
          discount: Math.round(((variant.mrp - variant.price) / variant.mrp) * 100),
        },
        quantity,
        subtotal: variant.price * quantity,
      });
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const increaseQty = async (req, res) => {
  const { productId, variantId } = req.body;
  const cart = await Cart.findOne({ user: req.ID });

  const item = cart.items.find(
    i => i.product.toString() === productId && i.variantId.toString() === variantId
  );

  if (!item) return res.status(404).json({ message: "Item not in cart" });

  // Check stock
  const product = await Product.findById(productId);
  const variant = product.variants.id(variantId);
  if (item.quantity + 1 > variant.stock) {
    return res.status(400).json({ message: "Not enough stock" });
  }

  item.quantity += 1;
  await cart.save();

  res.json({ message: "Quantity increased", cart });
};

const decreaseQty = async (req, res) => {
  const { productId, variantId } = req.body;
  const cart = await Cart.findOne({ user: req.ID });

  const item = cart.items.find(
    i => i.product.toString() === productId && i.variantId.toString() === variantId
  );

  if (!item) return res.status(404).json({ message: "Item not in cart" });

  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    // Option 1: prevent going below 1
    // return res.status(400).json({ message: "Minimum 1 quantity" });

    // Option 2: auto remove from cart
    cart.items = cart.items.filter(i => i !== item);
  }

  await cart.save();
  res.json({ message: "Quantity decreased", cart });
};

const removeFromCart = async (req, res) => {
  try {
    const { productId, variantId } = req.body; // sent from frontend
    const cart = await Cart.findOne({ user: req.ID });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Filter out the item to remove
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          item.variantId.toString() === variantId
        )
    );

    await cart.save();

    res.json({ success: true, message: "Item removed from cart", cart });
  } catch (err) {
    console.error("Remove Cart Error:", err);
    res.status(500).json({ success: false, message: "Failed to remove item" });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.ID });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = []; // empty array
    await cart.save();

    res.json({ success: true, message: "Cart cleared", cart });
  } catch (err) {
    console.error("Clear Cart Error:", err);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};

 module.exports = { 
   addToCart,
   increaseQty,
   decreaseQty,
   removeFromCart,
   clearCart
  };