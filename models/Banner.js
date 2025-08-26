const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false, // initially false; activated automatically
  },
  startDate: {
    type: Date,
    required: true,  // banner becomes active from this date
  },
  endDate: {
    type: Date,
    default: null,   // optional, can be left null
  },
}, { timestamps: true });

// Pre-save hook: automatically set active = true if startDate <= now
bannerSchema.pre("save", function(next) {
  if (this.startDate && new Date() >= this.startDate) {
    this.active = true;
  }
  next();
});

const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;
