const Favorite = require("../models/Favorite");
const Product = require("../models/Product");

// ✅ Add to favorites
const addFavorite = async (req, res) => {
  try {
    const userId = req.ID; // Assuming user is logged in via JWT middleware
    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Create or ignore if already exists
    const favorite = await Favorite.findOneAndUpdate(
      { user: userId, product: productId },
      { user: userId, product: productId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Added to favorites", favorite });
  } catch (error) {
    console.error("Add Favorite Error:", error);
    res.status(500).json({ success: false, message: "Failed to add favorite" });
  }
};

// ✅ Remove from favorites
const removeFavorite = async (req, res) => {
  try {
    const userId = req.ID;
    const { productId } = req.params;

    await Favorite.findOneAndDelete({ user: userId, product: productId });

    res.json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    console.error("Remove Favorite Error:", error);
    res.status(500).json({ success: false, message: "Failed to remove favorite" });
  }
};

// ✅ Get all user favorites
const getFavorites = async (req, res) => {
  try {
    const userId = req.ID;

    const favorites = await Favorite.find({ user: userId }).populate("product");

    res.json({ success: true, favorites });
  } catch (error) {
    console.error("Get Favorites Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch favorites" });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites };
