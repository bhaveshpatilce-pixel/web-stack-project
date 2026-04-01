const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { quickNotes, preferences, pomodoro } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (typeof quickNotes === "string") {
      user.quickNotes = quickNotes;
    }

    if (preferences && typeof preferences === "object") {
      if (typeof preferences.theme === "string") {
        user.preferences.theme = preferences.theme === "light" ? "light" : "dark";
      }
      if (typeof preferences.weatherCity === "string") {
        user.preferences.weatherCity = preferences.weatherCity.trim() || user.preferences.weatherCity;
      }
    }

    if (pomodoro && typeof pomodoro === "object") {
      if (typeof pomodoro.duration === "number" && pomodoro.duration > 0) {
        user.pomodoro.duration = Math.floor(pomodoro.duration);
      }
      if (typeof pomodoro.remainingSeconds === "number" && pomodoro.remainingSeconds >= 0) {
        user.pomodoro.remainingSeconds = Math.floor(pomodoro.remainingSeconds);
      }
      if (typeof pomodoro.isRunning === "boolean") {
        user.pomodoro.isRunning = pomodoro.isRunning;
      }
      if (typeof pomodoro.lastUpdatedAt === "string" || pomodoro.lastUpdatedAt instanceof Date) {
        user.pomodoro.lastUpdatedAt = new Date(pomodoro.lastUpdatedAt);
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      profile: {
        quickNotes: user.quickNotes,
        preferences: user.preferences,
        pomodoro: user.pomodoro,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login, me, updateProfile };
