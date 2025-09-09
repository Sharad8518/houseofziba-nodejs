const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add to Cart
const addToCart = async (req, res) => {
  try {
    const {
      productId,
      sku,
      attributes = [],
      quantity = 1,
      paddingDetails = null, // <-- get padding details from request
    } = req.body;
    const userId = req.ID;

    // Find product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Determine variant
    let variant;
    if (product.variants?.length > 0) {
      variant = sku ? product.variants.find((v) => v.sku === sku) : null;

      if (!variant && attributes.length > 0) {
        variant = product.variants.find((v) =>
          attributes.every((attr) =>
            v.attributes?.some(
              (a) => a.name === attr.name && a.value === attr.value
            )
          )
        );
      }
      if (!variant) variant = product.variants[0]; // fallback to first variant
    } else {
      variant = {
        sku: product._id.toString(),
        attributes: attributes.length ? attributes : [],
        additionalPrice: 0,
      };
    }

    const selectedAttributes = attributes.length
      ? attributes
      : variant.attributes || [];
    const currentPrice = product.salePrice ?? product.mrp;

    // Find or create user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists (same variant + attributes + padding)
    const existingItem = cart.items.find(
      (item) =>
        item.variant.sku === variant.sku &&
        JSON.stringify(item.variant.attributes) ===
          JSON.stringify(selectedAttributes) &&
        JSON.stringify(item.variant.paddingDetails || null) ===
          JSON.stringify(paddingDetails)
    );

    if (existingItem) {
      // If exists, just increase quantity
      existingItem.quantity += quantity;
      existingItem.subtotal = existingItem.quantity * currentPrice;
    } else {
      // Otherwise, append new item
      cart.items.push({
        product: productId,
        variant: {
          sku: variant.sku,
          attributes: selectedAttributes,
          price: currentPrice,
          paddingDetails, // <-- store padding details here
        },
        quantity,
        subtotal: currentPrice * quantity,
      });
    }

    // Save cart
    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const increaseQty = async (req, res) => {
  try {
    const { productId, sku, size } = req.body; // sku or size for Cloths
    const cart = await Cart.findOne({ user: req.ID });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find cart item
    const item = cart.items.find(
      (i) => i.product.toString() === productId && (i.variant.sku === sku || i.variant.size === size)
    );
    if (!item) return res.status(404).json({ message: "Item not in cart" });

    // Get product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ Jewellery stock check
    if (product.productType === "Jewellery") {
      if (item.quantity + 1 > product.quantity) {
        return res.status(400).json({ message: "Not enough stock" });
      }
    }

    // ✅ Cloths stock check (variant-based)
    if (product.productType === "Cloths") {
      const variant = product.variants.find((v) => v.sku === sku || v.size === size);
      if (!variant) {
        return res.status(400).json({ message: "Variant not found" });
      }
      if (item.quantity + 1 > variant.stock) {
        return res
          .status(400)
          .json({ message: `Only ${variant.stock} left for size ${variant.size}` });
      }
    }

    // ✅ Increase quantity and recalc subtotal
    item.quantity += 1;
    item.subtotal = item.quantity * item.variant.price;

    await cart.save();
    res.json({ message: "Quantity increased", cart });
  } catch (err) {
    console.error("Increase Qty Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const decreaseQty = async (req, res) => {
  try {
    const { productId, sku, size } = req.body; // sku or size for Cloths
    const cart = await Cart.findOne({ user: req.ID });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find cart item
    const item = cart.items.find(
      (i) => i.product.toString() === productId && (i.variant.sku === sku || i.variant.size === size)
    );
    if (!item) return res.status(404).json({ message: "Item not in cart" });

    // Get product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ Jewellery logic
    if (product.productType === "Jewellery") {
      if (item.quantity > 1) {
        item.quantity -= 1;
        item.subtotal = item.quantity * item.variant.price;
      } else {
        cart.items = cart.items.filter((i) => i !== item);
      }
    }

    // ✅ Cloths logic
    if (product.productType === "Cloths") {
      const variant = product.variants.find((v) => v.sku === sku || v.size === size);
      if (!variant) {
        return res.status(400).json({ message: "Variant not found" });
      }

      if (item.quantity > 1) {
        item.quantity -= 1;
        item.subtotal = item.quantity * item.variant.price;
      } else {
        cart.items = cart.items.filter((i) => i !== item);
      }
    }

    await cart.save();
    res.json({ message: "Quantity decreased", cart });
  } catch (err) {
    console.error("Decrease Qty Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const { productId, sku } = req.body; // Only productId and sku
    const cart = await Cart.findOne({ user: req.ID });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove items matching productId and sku
    cart.items = cart.items.filter(
      (item) =>
        !(item.product.toString() === productId && item.variant.sku === sku)
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

    cart.items = []; // empty array, totals will auto-calc
    await cart.save();

    res.json({ success: true, message: "Cart cleared", cart });
  } catch (err) {
    console.error("Clear Cart Error:", err);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.ID }).populate({
      path: "items.product",
      select: "title mrp salePrice media variants", // select only the fields you need
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json({ success: true, cart });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch cart" });
  }
};

module.exports = {
  addToCart,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart,
  getCart,
};
