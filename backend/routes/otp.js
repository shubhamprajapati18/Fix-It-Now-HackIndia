const express = require("express");
const router = express.Router();

// Simple in-memory storage for OTPs (for demonstration purposes)
const otpStore = new Map(); // phone -> { otp, expires }

router.post("/send", (req, res) => {
  const { phone } = req.body;
  if (!phone)
    return res.status(400).json({ error: "Phone number is required" });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store with 10 minute expiry
  otpStore.set(phone, {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
  });

  console.log(`\n===========================================`);
  console.log(`[SMS MOCK] OTP sent to ${phone}: ${otp}`);
  console.log(`===========================================\n`);

  res.status(200).json({ success: true, message: "OTP sent successfully" });
});

router.post("/verify", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  const storedData = otpStore.get(phone);

  if (!storedData) {
    return res
      .status(400)
      .json({
        error: "No OTP found for this number. Please request a new one.",
      });
  }

  if (Date.now() > storedData.expires) {
    otpStore.delete(phone);
    return res
      .status(400)
      .json({ error: "OTP has expired. Please request a new one." });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP. Please try again." });
  }

  // Verification successful
  otpStore.delete(phone); // Burn OTP after use
  res.status(200).json({ success: true, message: "OTP verified successfully" });
});

module.exports = router;
