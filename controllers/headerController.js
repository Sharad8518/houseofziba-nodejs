const Header  = require ("../models/Header.js");

// Get all
const getHeaders = async (req, res) => {
  try {
    const headers = await Header.find();
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
    const header = await Header.create(req.body);
    res.status(201).json(header);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update
const updateHeader = async (req, res) => {
  try {
    const header = await Header.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    getHeader,
    createHeader,
    updateHeader,
    deleteHeader
}