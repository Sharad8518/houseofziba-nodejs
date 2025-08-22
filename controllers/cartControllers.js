const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add to Cart
const addToCart = async (req, res) => {
  try {
    const { productId, sku, attributes = [], quantity = 1 } = req.body;
    const userId = req.ID;

    // Find product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Determine variant
    let variant;
    if (product.variants?.length > 0) {
      variant = sku ? product.variants.find(v => v.sku === sku) : null;

      if (!variant && attributes.length > 0) {
        variant = product.variants.find(v =>
          attributes.every(attr =>
            v.attributes.some(a => a.name === attr.name && a.value === attr.value)
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

    const selectedAttributes = attributes.length ? attributes : variant.attributes || [];
    const currentPrice = product.salePrice ?? product.mrp;

    // Find or create user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists (same variant + attributes)
    const existingItem = cart.items.find(item =>
      item.variant.sku === variant.sku &&
      JSON.stringify(item.variant.attributes) === JSON.stringify(selectedAttributes)
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
    const { productId, sku, attributes = [] } = req.body; // use SKU or attributes to identify variant
    const cart = await Cart.findOne({ user: req.ID });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find cart item
    const item = cart.items.find(i => 
      i.product.toString() === productId &&
      (
        i.variant.sku === sku ||
        (attributes.length > 0 && attributes.every(attr =>
          i.variant.attributes.some(a => a.name === attr.name && a.value === attr.value)
        ))
      )
    );

    if (!item) return res.status(404).json({ message: "Item not in cart" });

    // Get product and variant to check stock
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let variant;
    if (product.variants && product.variants.length > 0) {
      variant = product.variants.find(v => 
        v.sku === sku || attributes.every(attr =>
          v.attributes.some(a => a.name === attr.name && a.value === attr.value)
        )
      );
      if (!variant) return res.status(400).json({ message: "Invalid variant" });
    } else {
      variant = { stock: product.inventoryBySize?.get(attributes.find(a => a.name === "Size")?.value) || 0 };
    }

    // Check stock
    if (item.quantity + 1 > (variant.stock || 0)) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    // Increase quantity and recalc subtotal
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
    const { productId, sku, attributes = [] } = req.body; // identify variant
    const cart = await Cart.findOne({ user: req.ID });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find cart item
    const item = cart.items.find(i => 
      i.product.toString() === productId &&
      (
        i.variant.sku === sku ||
        (attributes.length > 0 && attributes.every(attr =>
          i.variant.attributes.some(a => a.name === attr.name && a.value === attr.value)
        ))
      )
    );

    if (!item) return res.status(404).json({ message: "Item not in cart" });

    if (item.quantity > 1) {
      item.quantity -= 1;
      item.subtotal = item.quantity * item.variant.price;
    } else {
      // Remove item if quantity goes below 1
      cart.items = cart.items.filter(i => i !== item);
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
    const { productId, sku, attributes = [] } = req.body; // identify variant
    const cart = await Cart.findOne({ user: req.ID });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Filter out the item to remove
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          (
            item.variant.sku === sku ||
            (attributes.length > 0 && attributes.every(attr =>
              item.variant.attributes.some(a => a.name === attr.name && a.value === attr.value)
            ))
          )
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
      path: 'items.product',
      select: 'title mrp salePrice media variants', // select only the fields you need
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
   getCart
  };