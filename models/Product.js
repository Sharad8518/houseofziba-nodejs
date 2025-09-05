// models/Product.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// --- Media
const MediaSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true },
    kind: { type: String, enum: ["image", "video", "other"], default: "image" },
    width: Number,
    height: Number,
    bytes: Number,
  },
  { _id: false }
);

// --- Variants
const VariantSchema = new Schema(
  {
    sku: { type: String, unique: true }, // auto-generated
    size: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    stock: { type: Number, default: 0 },
    lowStockAlertQty: { type: Number, default: 5 },
  },
  { _id: false }
);

// --- Reviews
const ReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    media:{MediaSchema},
    title: String,
    comment: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// --- FAQ
const FAQSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: true }
);


const shipmentSchema = new Schema(
  {
    title:{type:String, trim:true},
    description:{type:String, trim:true}
  }
)
// --- SEO
const SEOListingSchema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    slug: { 
      type: String, 
      trim: true, 
      lowercase: true, 
    },
    keywords: [{ type: String, trim: true }],
  },
  { _id: false }
);



// --- Product
const ProductSchema = new Schema(
  {
    header: { type: String },
    categories: [{ type: String }],
    subCategories: [{ type: String }],
    collections: [{ type: String }],

    itemNumber: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    productType: {
    type: String,
    enum: ["Cloths", "Jewellery"], // restricts values
    required: true,
  },

    media: [MediaSchema],
    variants: [VariantSchema],

    costPrice: { type: Number, min: 0 },
    marginPercent: { type: Number, min: 0, max: 100 },
    mrp: { type: Number, min: 0, required: true },
    salePrice: { type: Number, min: 0 },
    discountType: { type: String, enum: ["percent", "flat"], default: "percent" },
    discountValue: { type: Number, default: 0, min: 0 },
    saleStart: { type: Date },
    saleEnd: { type: Date },

    colour: { type: String, trim: true },

    fulfillmentType: {
      type: String,
      enum: ["MADE_TO_ORDER", "READY_TO_SHIP"],
      required: true,
    },
    estimatedShippingDate: { type: Date },
    estimatedShippingDays:{ type: Number},
    productDetail: { type: String },
    styleNo: { type: String },
    styleAndFit:{type:String},
    fabric: { type: String },
    work: { type: String },
    packContains: { type: String },
    care: { type: String },
    note: { type: String },
    occasion:{type:String},
    shortDescription:{type:String},

    productSpeciality: { type: String },
    shippingAndReturns:shipmentSchema ,

    productionDetail: {
      enabled: { type: Boolean, default: false },
      description: { type: String, trim: true },
    },

    dupatta: {
      enabled: { type: Boolean, default: false },
      description: { type: String, trim: true },
    },

    paddingRequired: { type: String, enum: ["Yes", "No"], default: "No" }, // ✅
    waist: { type: String },
    length: { type: String },
    height: { type: String },
 


    reviews: [ReviewSchema],
    averageRating: { type: Number, min: 0, max: 5, default: 0 },

    frequentlyBoughtTogether: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    similarProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],

    seo: SEOListingSchema,
    faq: [FAQSchema],

    status: { type: String, enum: ["DRAFT", "ACTIVE", "ARCHIVED"], default: "DRAFT" },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// --- Hooks
ProductSchema.pre("save", async function (next) {
  // --- Average Rating
  if (this.isModified("reviews")) {
    const ratings = (this.reviews || []).map((r) => r.rating);
    this.averageRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : 0;
  }

  // --- Pricing Validation
  if (this.salePrice != null && this.mrp != null && this.salePrice > this.mrp) {
    return next(new Error("salePrice cannot exceed mrp"));
  }

  // --- Slug Generation
  if (this.isModified("title") && (!this.seo || !this.seo.slug)) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let slug = baseSlug;
    let counter = 1;

    const Product = mongoose.model("Product");
    while (
      await Product.findOne({ "seo.slug": slug, _id: { $ne: this._id } })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.seo = { ...(this.seo || {}), slug };
  }

  // --- SKU Generation for Variants
  if (this.variants && this.title) {
    this.variants = this.variants.map((variant) => {
      if (!variant.sku) {
        const productPart = this.title
          .replace(/\s+/g, "")
          .toUpperCase()
          .slice(0, 6); // First 6 chars of product
        const sizePart = variant.size ? variant.size.toUpperCase() : "NA";
        const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random
        variant.sku = `${productPart}-${sizePart}-${randomPart}`;
      }
      return variant;
    });
  }

  next();
});

module.exports = mongoose.model("Product", ProductSchema);
