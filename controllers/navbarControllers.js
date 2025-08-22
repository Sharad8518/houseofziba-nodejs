const NavbarItem = require("../models/NavbarItem");

// Add a category or a subcategory
const addNavbarItem = async (req, res) => {
  try {
    const { label, url, icon, order, subcategories, isActive } = req.body;

    const navbarItem = new NavbarItem({
      label,
      url,
      icon,
      order,
      subcategories: subcategories || [], // Array of subcategory objects
      isActive
    });

    const savedItem = await navbarItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all navbar items
const getNavbarItem = async (req, res) => {
  try {
    const items = await NavbarItem.find().sort({ order: 1 }); // Sort by order
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Edit a category or its subcategories
const editNavbarItem = async (req, res) => {
  try {
    const updatedItem = await NavbarItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // return updated document
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Navbar item not found" });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a category (subcategories are nested, so deleted automatically)
const deleteNavbarItem = async (req, res) => {
  try {
    const deletedItem = await NavbarItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Navbar item not found" });
    }

    res.json({ message: "Navbar item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single navbar item by ID
const getNavbarItemById = async (req, res) => {
  try {
    const item = await NavbarItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching item", error: err.message });
  }
};

module.exports = {
  addNavbarItem,
  getNavbarItem,
  editNavbarItem,
  deleteNavbarItem,
  getNavbarItemById
};
