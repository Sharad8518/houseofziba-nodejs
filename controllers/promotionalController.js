const Promotional = require("../models/Promotional");

// ✅ Create Promotional Banner
const createPromotional = async (req, res) => {
  try {
    const { topBannerText, promoOffers } = req.body;

    const promo = new Promotional({
      topBannerText,
      promoOffers,
    });

    await promo.save();
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get All Promotions
const getPromotions = async (req, res) => {
  try {
    const promos = await Promotional.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Single Promotion by ID
const getPromotionById = async (req, res) => {
  try {
    const promo = await Promotional.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: "Promotion not found" });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update Promotion by ID
const updatePromotion = async (req, res) => {
  try {
    const { topBannerText, promoOffers } = req.body;

    const promo = await Promotional.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: "Promotion not found" });

    promo.topBannerText = topBannerText ?? promo.topBannerText;
    promo.promoOffers = promoOffers ?? promo.promoOffers;

    await promo.save();
    res.json(promo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete Promotion by ID
const deletePromotion = async (req, res) => {
  try {
    const promo = await Promotional.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ error: "Promotion not found" });
    res.json({ message: "Promotion deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPromotional,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
};
