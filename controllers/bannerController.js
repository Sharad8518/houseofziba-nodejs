const Banner = require("../models/Banner");
const { uploadFileToS3 } = require("../middlewares/file_handler");

const addBanner = async (req, res) => {
  try {
    const { title, message, startDate, endDate } = req.body;
    const imageUrl = await uploadFileToS3(req.file, "banners");
    const banner = new Banner({
      title,
      message,
      startDate,
      endDate,
      imageUrl: imageUrl,
      active: startDate && new Date() >= new Date(startDate), // auto active if startDate passed
    });

    await banner.save();
    res.status(201).json(banner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get All Banners
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Active Banners
const getActiveBanners = async (req, res) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      active: true,
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }).sort({ startDate: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update Banner
const updateBanner = async (req, res) => {
  try {
    const { title, message, startDate, endDate, active } = req.body;
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });

    if (req.file) {
      const uploaded = await uploadFilesToS3([req.file], "banners");
      banner.imageUrl = uploaded[0];
    }

    banner.title = title ?? banner.title;
    banner.message = message ?? banner.message;
    banner.startDate = startDate ?? banner.startDate;
    banner.endDate = endDate ?? banner.endDate;
    banner.active = active ?? banner.active;

    await banner.save();
    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete Banner
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });
    res.json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
};
