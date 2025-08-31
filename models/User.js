// models/User.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true }, // Home, Work, etc.
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: "India" },
    isDefault: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  { _id: false }
);


const userSchema = new mongoose.Schema(
  {
    // Common info
    name: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // optional
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // optional for guests using email
    },
    profileImage: String,

    // Role for type of account
    accountType: {
      type: String,
      enum: ["customer", "guest"],
      default: "guest",
    },

    // For customers only
    addresses: [addressSchema],
    dietaryPreferences: [String],
    favoriteCuisines: [String],
    allergies: [String],

    // OTP login fields
    otp: {
      code: String, // store plain for demo — hash in production
      expiresAt: Date,
    },

    lastLoginAt: Date,
    lastLoginIP: String,
    deviceInfo: String,

    signupMethod: {
      type: String,
      enum: ["otp", "email", "social","google"],
      default: "otp",
    },
    signupAt: { type: Date, default: Date.now },


    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
     deletedAt: Date,
  },
  { timestamps: true }
);

/* -------- OTP Methods -------- */
userSchema.methods.setOtp = function (code, ttlMinutes = 5) {
  this.otp.code = code;
  this.otp.expiresAt = new Date(Date.now() + ttlMinutes * 60000);
  return this.save();
};

userSchema.methods.verifyOtp = function (code) {
  if (!this.otp?.code || !this.otp?.expiresAt) return false;
  if (new Date() > this.otp.expiresAt) return false;
  return this.otp.code === code;
};

/* -------- Guest Conversion -------- */
// Upgrade guest to customer (e.g., after first order)
userSchema.methods.upgradeToCustomer = function (profileData = {}) {
  this.accountType = "customer";
  Object.assign(this, profileData); // fill in name, email, phone, addresses, etc.
  return this.save();
};

userSchema.methods.trackLogin = function (ip, device) {
  this.lastLoginAt = new Date();
  this.lastLoginIP = ip;
  this.deviceInfo = device;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
