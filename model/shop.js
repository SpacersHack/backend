const { Ottoman, model, Schema, addValidators } = require("ottoman");
const { ottoman } = require("../db/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your shop name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your shop email address"],
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  description: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "Seller",
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
      required: false,
    },
    url: {
      type: String,
      required: false,
    },
  },
  withdrawMethod: {
    type: Object,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  transections: [
    {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: () => new Date(),
      },
      updatedAt: {
        type: Date,
        default: () => new Date(),
      },
    },
  ],

  resetPasswordToken: String,
  resetPasswordTime: Date,
});

// Hash password before saving
shopSchema.pre("save", async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

// Update `updatedAt` timestamp before saving
shopSchema.pre("save", async (user) => {
  user.updatedAt = new Date();
});

// jwt token
shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, shopSchema.password);
};

module.exports = ottoman.model("Shop", shopSchema);
