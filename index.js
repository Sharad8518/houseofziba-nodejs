require("dotenv").config();
const express = require("express");
const { default: mongoose } = require("mongoose");
const DBconnection = require("./config/DBconnection");
const cors = require('cors');
const allowedOrigins = require("./config/allowOrigins");
const app = express();
const PORT = process.env.PORT || 8001;

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

DBconnection();

// Base route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Hitted on root" });
});

 const userRoutes = require("./routes/userRoutes")
 const adminRoutes = require("./routes/adminRoutes")
//  const subadminRoutes = require("./routes/subAdminRoute")

 



const corsOptions = {
  origin:allowedOrigins, // List of allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

app.use(cors(corsOptions));
app.use("/api/user",userRoutes);
app.use("/api/admin",adminRoutes);
// app.use("/api/subadmin",subadminRoutes);



mongoose.connection.once("open", () => {
    console.log(">> Connected to MongoDB 💾");
  });
  

// Start the Express server
app.listen(PORT, () => {
  console.log(`>> Server is listening at http://localhost:${PORT} 🚀`);
});