const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Email Transporter ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify Transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Service Error:", error.message);
  } else {
    console.log("✅ Email Service is Ready to send messages");
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  console.log("API HIT: /api/auth/register");
  console.log("Request Body:", req.body);
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
    res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  console.log("API HIT: /api/auth/login");
  console.log("Request Body:", req.body);
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google SignIn
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  console.log("API HIT: /api/auth/google");
  try {
    const { credential } = req.body;
    
    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    let user = await User.findOne({ email });

    // Link account or create new
    if (user) {
      if (!user.googleId) {
         user.googleId = sub;
         user.profilePic = user.profilePic || picture;
         await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId: sub,
        profilePic: picture,
      });
    }

    // Check blocked status
    if (user.isBlocked) {
       return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ message: "Invalid Google Token or Server Error" });
  }
};

// @desc    Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password?token=${otp}&email=${email}`;

    const mailOptions = {
      from: `"Forever Supports" <${process.env.SMTP_USER || 'msd50697@gmail.com'}>`,
      to: email,
      subject: 'Reset Your Password - Forever',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6;">We received a request to reset your password. You can do this immediately by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>

          <p style="color: #475569; line-height: 1.6;">Alternatively, you can use this 6-digit verification code in the app:</p>
          <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #1b2230; margin: 15px 0;">${otp}</div>
          
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #f1f5f9; pt: 20px;">This link and code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.log('--- EMAIL SENDING FAILED (SMTP not configured) ---');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log('--------------------------------------------------');
      
      // We don't throw here so the user can still use the console OTP for testing
    }

    res.json({ message: 'If the email is valid, you will receive an OTP shortly.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, googleLogin, forgotPassword, resetPassword };
