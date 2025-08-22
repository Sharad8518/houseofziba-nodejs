const SubCategory = require("../models/SubCategory.js")

// Get all subcategories
 const getSubCategories = async (req, res) => {
  try {
    const subcategories = await SubCategory.find().populate("category");
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single subcategory
const getSubCategory = async (req, res) => {
  try {
    const subcategory = await SubCategory.findById(req.params.id).populate("category");
    if (!subcategory) return res.status(404).json({ message: "SubCategory not found" });
    res.json(subcategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create subcategory 
 const createSubCategory = async (req, res) => {
  try {
    const subcategory = await SubCategory.create(req.body);
    res.status(201).json(subcategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update subcategory
 const updateSubCategory = async (req, res) => {
  try {
    const subcategory = await SubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subcategory) return res.status(404).json({ message: "SubCategory not found" });
    res.json(subcategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete subcategory
 const deleteSubCategory = async (req, res) => {
  try {
    const subcategory = await SubCategory.findByIdAndDelete(req.params.id);
    if (!subcategory) return res.status(404).json({ message: "SubCategory not found" });
    res.json({ message: "SubCategory deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { 
getSubCategories,
getSubCategory,
createSubCategory,
updateSubCategory,
deleteSubCategory 
}