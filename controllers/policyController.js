const { json } = require("body-parser");
const Policy = require("../models/Policy");

const addPolicy = async (req, res) => {
  try {
    const policy = new Policy(req.body);
    await policy.save();
    res.status(201).json(policy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!policy) return res.status(404), json({ message: "Policy not found" });
    res.json(policy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(res.params.id);
    if (!policy) return res.status(404).json({ message: "Policy Not found" });
    res.json({ message: "Policy deleted successfully" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

module.exports = {
  addPolicy,
  getPolicies,
  updatePolicy,
  deletePolicy
};
