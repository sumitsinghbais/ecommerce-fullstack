const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

module.exports = { registerUser, loginUser, googleLogin };
