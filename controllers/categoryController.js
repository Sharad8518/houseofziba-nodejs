const Category = require ("../models/Category.js");
const { uploadFileToS3 } = require("../middlewares/file_handler");

 const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("header");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    let imageUrl = "";
     if (req.file) {
              imageUrl = await uploadFileToS3(req.file, "category");
            } else {
              return res.status(400).json({ error: "Image is required" });
            }
    const category = await Category.create({
      ...req.body,
      image: imageUrl,
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

 const updateCategory = async (req, res) => {
  try {
     let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadFileToS3(req.file, "category");
    }
    
    const updateData ={
      ...req.body,
       image: imageUrl,
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      updateData, 
    { new: true }
    );      
    if (!category) return res.status(404).json({ message: "Category not found" });      
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  } 
};

 const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
getCategories,
createCategory,
updateCategory,
deleteCategory,
};
