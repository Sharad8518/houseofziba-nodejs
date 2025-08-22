const Collection = require("../models/Collection.js")

// Get all collections
const getCollections = async (req, res) => {
  try {
    const collections = await Collection.find().populate("subcategory");
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single collection
const getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id).populate("subcategory");
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create collection
 const createCollection = async (req, res) => {
  try {
    const collection = await Collection.create(req.body);
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update collection
 const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete collection
 const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json({ message: "Collection deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCollections,
  getCollection,    
  createCollection,
  updateCollection,
  deleteCollection
};