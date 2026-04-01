const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    quickNotes: {
      type: String,
      default: "",
      trim: true,
    },
    pomodoro: {
      duration: {
        type: Number,
        default: 25 * 60,
      },
      remainingSeconds: {
        type: Number,
        default: 25 * 60,
      },
      isRunning: {
        type: Boolean,
        default: false,
      },
      lastUpdatedAt: {
        type: Date,
        default: null,
      },
    },
    preferences: {
      theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark",
      },
      weatherCity: {
        type: String,
        default: "London",
        trim: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
