const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  await mongoose.connect(mongoURI);
  console.log("MongoDB connected");
};

module.exports = connectDB;
