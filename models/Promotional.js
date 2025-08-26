const mongoose = require("mongoose");

const PromotionalSchema = new mongoose.Schema({
  topBannerText: { type: String },          // simple text
  // or for multiple offers
  promoOffers: [
    {
      condition: String,
      reward: String
    }
  ]
});


module.exports = mongoose.model("Promotional", PromotionalSchema);