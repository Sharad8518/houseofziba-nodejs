const mongoose = require("mongoose");
const { Schema } = mongoose;

const policySchemm = new Schema(
  {
    title: {
      type: String,
      trim: true,
      require: true,
    },

    decreption: {
      type: String,
      trim: true,
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy',policySchemm)