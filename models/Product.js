// models/Product.js
const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true },
    kind: { type: String, enum: ['image', 'video', 'other'], default: 'image' },
    width: Number,
    height: Number,
    bytes: Number,
  },
  { _id: false }
);

const VariantSchema = new mongoose.Schema(
  {
    attributes: [
      {
        name: { type: String, required: true, trim: true },  // e.g. "Size", "Color"
        value: { type: String, required: true, trim: true }, // e.g. "L", "Red"
      },
    ],
    sku: { type: String, trim: true, index: true },
    additionalPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
  },
  { _id: false, timestamps: true }
);

VariantSchema.virtual("finalPrice").get(function () {
  const base = this.parent().mrp || 0;
  return base + (this.additionalPrice || 0);
});

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    comment: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const FAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: true }
);

const ProductDetailSchema = new mongoose.Schema(
  {
    styleNo: { type: String, trim: true },          // Style No
    colour: { type: String, trim: true },           // Colour
    fabric: { type: String, trim: true },           // Fabric
    work: { type: String, trim: true },             // Work
    packContains: { type: String, trim: true },     // Pack Contains
    care: { type: String, trim: true },             // Care
    note: { type: String, trim: true },             // Note
  },
  { _id: false }
);

const SEOListingSchema = new mongoose.Schema(
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

const ProductSchema = new mongoose.Schema(
  {
    header: { type: mongoose.Schema.Types.ObjectId, ref: "Header" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: "Collection" },

    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    // Core
    itemNumber: { type: String, required: true, trim: true, unique: true }, // "Item Number"
    title: { type: String, required: true, trim: true }, // "Title"
    description: { type: String, trim: true }, // "Description"

    media: [MediaSchema], // "Media"

    // Sizes & Inventory
    variants: [VariantSchema], // "Size (Variant)"
    inventoryBySize: {
      // "Size (Inventory)"
      type: Map,
      of: { type: Number, min: 0 },
      default: undefined,
    },

    // Pricing
    costPrice: { type: Number, min: 0 }, // from "Cost -Margin"
    marginPercent: { type: Number, min: 0, max: 100 }, // from "Cost -Margin"
    mrp: { type: Number, min: 0, required: true }, // "Rate of ITEM (MRP)"
    salePrice: { type: Number, min: 0 }, // "Offer or Sales Price"

    onSale: { type: Boolean, default: false },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      default: "percent",
    },
    discountValue: { type: Number, default: 0, min: 0 },
    saleStart: { type: Date },
    saleEnd: { type: Date },

    colour: { type: String, trim: true }, // "Colour"

    fulfillmentType: {
      // "Made to Order | Ready to Ship Select One"
      type: String,
      enum: ["MADE_TO_ORDER", "READY_TO_SHIP"],
      required: true,
    },
    estimatedShippingDate: { type: Date }, // "Estimated Shiping Date"

    // Rich product details
    productDetail: ProductDetailSchema, // Product Detail(...)
    productSpeciality: [{ type: String, trim: true }], // "Product Speciality"
    shippingAndReturns: { type: String, trim: true }, // "Shipping and Returns"

    // Social proof
    reviews: [ReviewSchema], // "Review"
    averageRating: { type: Number, min: 0, max: 5, default: 0 },

    // Cross-sell
    frequentlyBoughtTogether: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ], // "Pair It..."
    similarProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // "Similar Products"

    // SEO
    seo: SEOListingSchema, // "Search engine listing"

    // FAQ
    faq: [FAQSchema], // "FAQ"

    // Operational
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
      default: "DRAFT",
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Derived / hooks ---
ProductSchema.pre('save', async function (next) {
  // Keep averageRating in sync
  if (this.isModified('reviews')) {
    const ratings = (this.reviews || []).map(r => r.rating);
    this.averageRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;
  }

  // Validate pricing logic
  if (this.salePrice != null && this.mrp != null && this.salePrice > this.mrp) {
    return next(new Error('salePrice cannot exceed mrp'));
  }

  // --- ✅ Auto-generate slug ---
  if (this.isModified('title') && (!this.seo || !this.seo.slug)) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;

    const Product = mongoose.model('Product');
    while (await Product.findOne({ 'seo.slug': slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.seo = { ...(this.seo || {}), slug };
  }

  next();
});

// Text index for search across key fields
ProductSchema.index({
  title: 'text',
  description: 'text',
  colour: 'text',
  'productDetail.styleNo': 'text',
  'productDetail.fabric': 'text',
  'productDetail.work': 'text',
});

// Handy virtual: inStock
ProductSchema.virtual('inStock').get(function () {
  const bySize = this.inventoryBySize ? Array.from(this.inventoryBySize.values()) : [];
  const fromVariants = (this.variants || []).map(v => v.stock || 0);
  const total = [...bySize, ...fromVariants].reduce((a, b) => a + b, 0);
  return total > 0;
});

module.exports = mongoose.model('Product', ProductSchema);
