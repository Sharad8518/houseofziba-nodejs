const mongoose = require('mongoose');

const headerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
      status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    showNavbar:{
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    image: { type: String,required: true},
     addCategory:{
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Header', headerSchema);

