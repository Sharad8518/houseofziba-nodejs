
const FrequentlyBoughtTogether = require("../models/FrequentlyBoughtTogether");
const { uploadFilesToS3 } = require("../middlewares/file_handler");

const createFBTItem = async (req, res) => {
    try {
    const fbtData = { ...req.body };

    // Handle file uploads (images/videos to S3)
    if (req.files) {
      // Ensure req.files is always an array
      const filesArray = Array.isArray(req.files) ? req.files : [req.files];

      // Upload files to S3 inside "fbt" folder
      const uploadedMedia = await uploadFilesToS3(filesArray, "fbt");

      fbtData.images = filesArray.map((file, index) => ({
        url: uploadedMedia[index].url,
        alt: file.originalname,
        kind: file.mimetype.startsWith("video") ? "video" : "image",
        bytes: file.size,
      }));
    }

    // Parse JSON string fields if sent as string
    const parseIfString = (field) => {
      if (fbtData[field] && typeof fbtData[field] === "string") {
        try {
          fbtData[field] = JSON.parse(fbtData[field]);
        } catch (err) {
          console.warn(`Failed to parse ${field}, leaving as string`);
        }
      }
    };

    ["products", "seo"].forEach(parseIfString);

    // Ensure numeric values are parsed
    if (fbtData.price) fbtData.price = Number(fbtData.price);

    // Required field validation
    const requiredFields = ["title"];
    for (const field of requiredFields) {
      if (!fbtData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Save to DB
    const fbtItem = new FrequentlyBoughtTogether(fbtData);
    await fbtItem.save();

    res.status(201).json({
      success: true,
      message: "FBT item created successfully",
      item: fbtItem,
    });
  } catch (error) {
    console.error("Add FBT Item Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create FBT item",
      error: error.message,
    });
  }
};


const getFBTItems = async (req, res) => {
  try {
    const items = await FrequentlyBoughtTogether.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const updateFBTItem = async (req, res) => {
  try {
    const item = await FrequentlyBoughtTogether.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const deleteFBTItem = async (req, res) => {
  try {
    const item = await FrequentlyBoughtTogether.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createFBTItem,    
    getFBTItems,
    updateFBTItem,
    deleteFBTItem
};