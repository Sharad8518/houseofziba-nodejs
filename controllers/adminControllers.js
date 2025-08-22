const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");



const addAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    // prevent duplicate email
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Admin already exists" });
    }

    const admin = new Admin({
      name,
      email,
      password,
      role: role || "admin",
      permissions: permissions || {}
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Add Admin Error:", error);
    res.status(500).json({ success: false, message: "Failed to create admin" });
  }
};

/* ✅ Admin Login */
const loginAdmin = async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body; 
    // deviceInfo = { deviceId, deviceType, os, browser, ip, location }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { ID: admin._id, ROLE: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Track Device
    if (deviceInfo) {
      const existingDeviceIndex = admin.devices.findIndex(
        (d) => d.deviceId === deviceInfo.deviceId
      );

      if (existingDeviceIndex >= 0) {
        admin.devices[existingDeviceIndex] = {
          ...admin.devices[existingDeviceIndex]._doc,
          ...deviceInfo,
          lastLogin: new Date(),
          isActive: true,
        };
      } else {
        admin.devices.push({ ...deviceInfo, lastLogin: new Date(), isActive: true });
      }
    }

    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin,
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

/* 🚪 Admin Logout */
const logoutAdmin = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const adminId = req.user.ID; // comes from auth middleware

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (deviceId) {
      const device = admin.devices.find((d) => d.deviceId === deviceId);
      if (device) {
        device.isActive = false;
      }
    }

    await admin.save();

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Admin Logout Error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

const logoutAllDevices = async (req, res) => {
  try {
    const adminId = req.user.ID;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    admin.devices.forEach((d) => (d.isActive = false));
    await admin.save();

    res.json({ success: true, message: "Logged out from all devices" });
  } catch (error) {
    console.error("Logout All Error:", error);
    res.status(500).json({ success: false, message: "Failed to logout from all devices" });
  }
};

module.exports = {addAdmin, loginAdmin, logoutAdmin,logoutAllDevices };
