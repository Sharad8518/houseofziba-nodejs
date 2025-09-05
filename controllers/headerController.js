const Header  = require ("../models/Header.js");
const { uploadFileToS3 } = require("../middlewares/file_handler");
// Get all
const getHeaders = async (req, res) => {
  try {
    const headers = await Header.find(); // only Active
    res.json(headers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all
const getHeadersAllowCategory = async (req, res) => {
  try {
    const headers = await Header.find({ addCategory: "Yes" }); // only Active
    res.json(headers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get one
const getHeader = async (req, res) => {
  try {
    const header = await Header.findById(req.params.id);
    if (!header) return res.status(404).json({ message: "Header not found" });
    res.json(header);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create
const createHeader = async (req, res) => {
  try {
      let imageUrl = "";
        if (req.file) {
          imageUrl = await uploadFileToS3(req.file, "header");
        } else {
          return res.status(400).json({ error: "Image is required" });
        }
    const header = await Header.create({
      ...req.body,
    image: imageUrl,
    });
  
    res.status(201).json(header);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update
const updateHeader = async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadFileToS3(req.file, "header");
    }

    // Merge req.body with imageUrl if available
    const updateData = {
      ...req.body,
      image: imageUrl, // only add if not empty
    };

    const header = await Header.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!header) {
      return res.status(404).json({ error: "Header not found" });
    }

    res.json(header);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete
const deleteHeader = async (req, res) => {
  try {
    await Header.findByIdAndDelete(req.params.id);
    res.json({ message: "Header deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
    getHeaders,
    getHeadersAllowCategory,
    getHeader,
    createHeader,
    updateHeader,
    deleteHeader
}