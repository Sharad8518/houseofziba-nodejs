const Product = require("../models/Product");
const { uploadFilesToS3,uploadFileToS3 } = require("../middlewares/file_handler");

/* ---------------- Add Product ---------------- */
const addProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    // Handle file uploads (images/videos to S3)
    if (req.files) {
      // Ensure req.files is always an array
      const filesArray = Array.isArray(req.files) ? req.files : [req.files];

      const uploadedMedia = await uploadFilesToS3(filesArray, "products");

      productData.media = filesArray.map((file, index) => ({
        url: uploadedMedia[index].url,
        alt: file.originalname,
        kind: file.mimetype.startsWith("video") ? "video" : "image",
        bytes: file.size,
      }));
    }

    // Parse JSON string fields if they are strings
    const parseIfString = (field) => {
      if (productData[field] && typeof productData[field] === "string") {
        try {
          productData[field] = JSON.parse(productData[field]);
        } catch (err) {
          console.warn(`Failed to parse ${field}, leaving as string`);
        }
      }
    };

    ["variants", "seo", "faq", "productionDetail", "dupatta","shippingAndReturns"].forEach(
      parseIfString
    );

       ["categories", "subCategories", "collections"].forEach((field) => {
      if (productData[field] && Array.isArray(productData[field])) {
        productData[field] = productData[field].map((val) => {
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch (err) {
            return val;
          }
        }).flat();
      }
    });


    // Ensure numeric values are parsed
    if (productData.discountValue)
      productData.discountValue = Number(productData.discountValue);
    if (productData.price) productData.price = Number(productData.price);

    // Validate required fields
    const requiredFields = ["itemNumber", "fulfillmentType"];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Create and save product
    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

/* ---------------- Get All Products ---------------- */
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      title,
      itemNumber,
      status,
    } = req.query;
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);

    let filter = {};

    // 🔎 Global Search (title, description, etc. with $text index)
    if (search && search.trim() !== "") {
      filter.$text = { $search: search };
    }

    // 🔎 Title filter (partial match, case insensitive)
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    // 🔎 Item number filter (exact match)
    if (itemNumber) {
      filter.itemNumber = itemNumber;
    }

    // 🔎 Status filter (exact match, e.g. active/inactive)
    if (status) {
      filter.status = status;
    }

    const products = await Product.find(filter)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 }); // optional: latest first

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: pageNumber,
      limit: pageSize,
      pages: Math.ceil(total / pageSize),
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ---------------- Get Single Product ---------------- */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate({
        path: "similarProducts",
        select: "title description media salePrice mrp status", // select fields you need
      })
      .populate({
        path: "frequentlyBoughtTogether",
        select: "title description images price status",
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productObj = product.toObject();
    if (product.inventoryBySize) {
      // Convert Map → Object
      const allSizes = Object.fromEntries(product.inventoryBySize);

      // Filter sizes with qty > 0
      const availableSizes = Object.entries(allSizes)
        .filter(([size, qty]) => qty > 0)
        .map(([size]) => size); // keep only the size keys

      productObj.inventoryBySize = availableSizes;
    }

    res.json({
      success: true,
      product: {
        ...productObj,
        finalPrice: product.finalPrice,
      },
    });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

const addfbtoProduct = async (req, res) => {
  try {
    const { productId, fbtIds } = req.body; // fbtIds = array

    if (!productId || !Array.isArray(fbtIds)) {
      return res.status(400).json({
        success: false,
        message: "productId and fbtIds[] are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Merge unique IDs
    const existing = product.frequentlyBoughtTogether.map((id) =>
      id.toString()
    );
    const toAdd = fbtIds.filter((id) => !existing.includes(id));

    if (toAdd.length > 0) {
      product.frequentlyBoughtTogether.push(...toAdd);
      await product.save();
    }

    res.json({
      success: true,
      message: "FBT items added successfully",
      product,
    });
  } catch (error) {
    console.error("Add FBT to Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add FBT items",
      error: error.message,
    });
  }
};

const removefbtFromProduct = async (req, res) => {
  try {
    const { productId, fbtId } = req.body;

    if (!productId || !fbtId) {
      return res.status(400).json({
        success: false,
        message: "Both productId and fbtId are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Remove the FBT item if it exists
    product.frequentlyBoughtTogether = product.frequentlyBoughtTogether.filter(
      (id) => id.toString() !== fbtId
    );
    await product.save();

    res.json({
      success: true,
      message: "FBT item removed from product successfully",
      product,
    });
  } catch (error) {
    console.error("Remove FBT from Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove FBT item from product",
      error: error.message,
    });
  }
};

const addSimilarProduct = async (req, res) => {
  try {
    const { productId, similarProductIds } = req.body;

    if (
      !productId ||
      !similarProductIds ||
      !Array.isArray(similarProductIds) ||
      similarProductIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "productId and similarProductIds[] are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Add new similar products, avoiding duplicates
    similarProductIds.forEach((id) => {
      if (!product.similarProducts.includes(id)) {
        product.similarProducts.push(id);
      }
    });

    await product.save();

    res.json({
      success: true,
      message: "Similar products added successfully",
      product,
    });
  } catch (error) {
    console.error("Add Similar Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add similar products",
      error: error.message,
    });
  }
};

const addFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { productId, frequentlyBoughtIds } = req.body;

    if (
      !productId ||
      !frequentlyBoughtIds ||
      !Array.isArray(frequentlyBoughtIds) ||
      frequentlyBoughtIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "productId and frequentlyBoughtIds[] are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Add new FBT products, avoiding duplicates
    frequentlyBoughtIds.forEach((id) => {
      if (!product.frequentlyBoughtTogether.includes(id)) {
        product.frequentlyBoughtTogether.push(id);
      }
    });

    await product.save();

    res.json({
      success: true,
      message: "Frequently Bought Together products added successfully",
      product,
    });
  } catch (error) {
    console.error("Add FBT Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add frequently bought together products",
      error: error.message,
    });
  }
};

const productfilter = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      colour,
      size,
      minPrice,
      maxPrice,
      categories,
      subCategories,
      header,
      fabric,
      work, // craft
      collections, // occasion
      minDiscount,
      sortBy,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);

    const filter = {};

    // 🔍 Search (regex if no text index)
    if (search && search.trim() !== "") {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // 🎨 Colour filter (?colour=red&colour=blue)
    if (colour) {
      const colours = Array.isArray(colour) ? colour : colour.split(",");
      filter.colour = { $in: colours.map((c) => c.trim()) };
    }

    // 📏 Size filter (?size=M&size=XL)
    if (size) {
      let sizes = [];
      if (Array.isArray(size)) {
        sizes = size;
      } else {
        sizes = size.split(","); // support comma separated
      }
      filter["variants.size"] = { $in: sizes.map((s) => s.trim()) };
    }

    // 💰 Price filter (?minPrice=100&maxPrice=500)
    if (minPrice || maxPrice) {
      filter.mrp = {};
      if (minPrice) filter.mrp.$gte = Number(minPrice);
      if (maxPrice) filter.mrp.$lte = Number(maxPrice);
    }

    // 📂 Category filter (?categories=Lehenga&categories=Saree)
    if (categories) {
      const cats = Array.isArray(categories) ? categories : [categories];
      filter.categories = { $in: cats };
    }

    // 📂 SubCategory filter
    if (subCategories) {
      const subs = Array.isArray(subCategories)
        ? subCategories
        : [subCategories];
      filter.subCategories = { $in: subs };
    }

    // 🏷 Header filter
    if (header) {
      filter.header = new RegExp(header, "i");
    }

    // 🧵 Fabric filter
    if (fabric) {
      const fabrics = Array.isArray(fabric) ? fabric : [fabric];
      filter.fabric = { $in: fabrics };
    }

    // 🎨 Work/Craft filter
    if (work) {
      const works = Array.isArray(work) ? work : [work];
      filter.work = { $in: works };
    }

    // 🎉 Occasion filter (mapped to collections)
    if (collections) {
      const occ = Array.isArray(collections) ? collections : [collections];
      filter.collection = { $in: occ };
    }

    if (minDiscount) {
      filter.discountValue = { $gte: Number(minDiscount) };
    }

    let sortQuery = {};
    if (sortBy) {
      switch (sortBy) {
        case "lowmrp":
          sortQuery.mrp = 1; // ascending
          break;
        case "highmrp":
          sortQuery.mrp = -1; // descending
          break;
        case "discount":
          sortQuery.discountValue = -1; // highest discount first
          break;
        case "newest":
          sortQuery.createdAt = -1; // latest products
          break;
        default:
          break;
      }
    }
    // 🛒 Fetch products
    const products = await Product.find(filter)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: pageNumber,
      limit: pageSize,
      pages: Math.ceil(total / pageSize),
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCurrentMonthProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);

    const now = new Date();

    // First day of the current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last day of the current month
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const filter = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };

    const products = await Product.find(filter)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: pageNumber,
      limit: pageSize,
      pages: Math.ceil(total / pageSize),
      products,
    });
  } catch (error) {
    console.error("Get Current Month Products Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addOrUpdateReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment,userName } = req.body;

    if (!rating) {
      return res
        .status(400)
        .json({ success: false, message: "Rating is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const userId = req.ID;       // ✅ from protect middleware

    let media = null;

    // --- Handle image upload if present
    if (req.file) {
      const file = req.file; // multer single upload ("file")
      const uploadResult = await uploadFileToS3(file, "reviews"); // folder = reviews
      media = {
        url: uploadResult.Location,
        alt: title || "review image",
        kind: "image",
        bytes: file.size,
        width: null,
        height: null,
      };
    }

    // --- Check if user already reviewed
    const existingReviewIndex = product.reviews.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReviewIndex > -1) {
      // Update existing review
      product.reviews[existingReviewIndex] = {
        ...product.reviews[existingReviewIndex]._doc,
        rating,
        title,
        comment,
        media: media || product.reviews[existingReviewIndex].media,
        updatedAt: new Date(),
      };
    } else {
      // Add new review
      product.reviews.push({
        userId,
        name: userName,
        rating,
        title,
        comment,
        media,
        createdAt: new Date(),
      });
    }

    // --- Update average rating
    const ratings = product.reviews.map((r) => r.rating);
    product.averageRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    await product.save();

    res.json({
      success: true,
      message: existingReviewIndex > -1 ? "Review updated" : "Review added",
      product,
    });
  } catch (error) {
    console.error("Review Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  addfbtoProduct,
  removefbtFromProduct,
  addSimilarProduct,
  productfilter,
  addFrequentlyBoughtTogether,
  getCurrentMonthProducts,
  addOrUpdateReview,
};
