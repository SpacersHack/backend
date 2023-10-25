const { model, Schema } = require("ottoman");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ottomanStore, ottoman } = require("../db/database");

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email!"],
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
  },
  role: {
    type: String,
    default: "user",
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },

  otpExpiryTime: {
    type: Date,
  },
  avatar: {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
});

// Hash password before saving
userSchema.pre("save", async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

// Update `updatedAt` timestamp before saving
userSchema.pre("save", async (user) => {
  user.updatedAt = new Date();
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, userSchema.password);
};

module.exports = ottoman.model("User", userSchema);
