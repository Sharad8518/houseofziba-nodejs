const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const deviceSchema = new Schema(
  {
    deviceId: { type: String, trim: true },        // UUID or generated ID
    deviceType: { type: String, trim: true },      // Mobile, Desktop, Tablet
    os: { type: String, trim: true },              // Android, iOS, Windows, MacOS
    browser: { type: String, trim: true },         // Chrome, Safari, Edge
    ip: { type: String, trim: true },              // IP address
    location: { type: String, trim: true },        // City, Country (optional)
    lastLogin: { type: Date, default: Date.now },  // Last login time
    isActive: { type: Boolean, default: true },    // Active session or not
  },
  { _id: false }
);

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["superadmin", "admin", "moderator"],
      default: "admin",
    },

    permissions: {
      manageUsers: { type: Boolean, default: false },
      manageVendors: { type: Boolean, default: false },
      manageProducts: { type: Boolean, default: false },
      manageOrders: { type: Boolean, default: false },
      manageCategories: { type: Boolean, default: false },
      manageCoupons: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
    },

    devices: [deviceSchema],   // ✅ Added devices tracking

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

/* 🔒 Password hashing */
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ✅ Compare Password */
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
