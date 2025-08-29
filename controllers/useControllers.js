const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const twilio = require("twilio")


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_ACCOUNT_TOKEN
);

 const sentOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Not a valid phone number" });
    }

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ phone });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP & expiry to DB
    await user.setOtp(otpCode);

    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP code is ${otpCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`, // prepend country code (e.g., +91 for India)
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


const verifyOTP = async(req,res)=>{
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.verifyOtp(otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

     await user.trackLogin(req.ip, req.headers["user-agent"]);

    // Generate JWT
    const token = jwt.sign(
      {
        ID: user._id,
        phone: user.phone,
        accountType: user.accountType,
        ROLE:"CUSTOMER",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Optionally clear OTP after successful login
    user.otp = { code: null, expiresAt: null };
    await user.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        phone: user.phone,
        accountType: user.accountType,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

const loginWithGoogle = async(req,res)=>{
 try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "ID token required" });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const { email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(403).json({ message: "Email not verified by Google" });
    }

    // Find user by email
    let user = await User.findOne({ email });

    if (!user) {
      // If not found → create new user
      user = new User({
        name,
        email,
        profileImage: picture,
        accountType: "customer",
        signupMethod: "google",
      });
      await user.save();
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT for session
    const token = jwt.sign(
      {
        ID: user._id,
        email: user.email,
        ROLE: user.accountType?.toUpperCase() || "CUSTOMER",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        role: user.accountType,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
}

const loginWithFacebook = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Access token required" });
    }

    // ✅ Verify Facebook token and get user profile
    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    const { email, name, picture } = fbResponse.data;

    if (!email) {
      return res.status(400).json({ message: "Facebook account must have an email" });
    }

    // ✅ Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        profileImage: picture?.data?.url,
        accountType: "customer",
        signupMethod: "social",
      });
      await user.save();
    }

    // ✅ Update login info
    user.lastLoginAt = new Date();
    await user.save();

    // ✅ Generate JWT
    const token = jwt.sign(
      { ID: user._id, email: user.email, ROLE: "CUSTOMER" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    console.error("Facebook login error:", error?.response?.data || error.message);
    res.status(500).json({ message: "Facebook login failed" });
  }
};



const completeProfile = async(req,res)=>{
  try {
    const { name, email, addresses } = req.body;
 const { ID } = req;
    const user = await User.findById(ID);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    // Update addresses if provided
    if (addresses && Array.isArray(addresses)) {
      user.addresses = addresses.map(addr => ({
        label: addr.label,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country || "India",
        isDefault: addr.isDefault || false,
        location: addr.location || { type: "Point", coordinates: [0, 0] }
      }));
    }

     if (user.accountType === "guest") {
      user.accountType = "customer";
    }
    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

const getProfile = async (req, res) => {
  try {
    const { ID } = req;

    const user = await User.findById(ID).select("-otp -__v -deletedAt"); // hide sensitive fields
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: "User not found", 
        data: null 
      });
    }

    res.json({
      status: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
      data: null,
    });
  }
};



 module.exports = { 
    sentOTP,
    verifyOTP,
    loginWithGoogle,
    loginWithFacebook,
    completeProfile,
    getProfile
  };