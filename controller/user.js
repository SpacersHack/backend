const express = require("express");
const User = require("../model/user");
const router = express.Router();
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const generateOTP = require("../utils/generateOTP");

router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide all fields!", 400));
      }
      // Check if the user with the given email exists
      const user = await User.findOne({ email });

      if (!user || user === undefined || user === null) {
        return next(new ErrorHandler("User not found", 400));
      }

      // Check if the user is blocked
      if (user.isBlocked) {
        return next(
          new ErrorHandler("Account blocked, please contact the admin", 403)
        );
      }

      // Check if the user is not verified
      if (!user.isVerified) {
        return next(new ErrorHandler("Account not verified", 403));
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password // Assuming 'password' is a property of the Ottoman model
      );

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Create a new user
router.post("/create-user", async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      throw new ErrorHandler("Please fill the form correctly", 400);
    }

    try {
      const emailExist = await User.findOne({ email });

      if (emailExist) {
        return next(
          new ErrorHandler("User with this email already exists", 400)
        );
      }
    } catch (error) {
      if (error.name === "DocumentNotFoundError") {
        // Handle the case where no document is found
        // You can proceed to create a new user with this email
        // or take the appropriate action as needed.
        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
        });

        const { otp, otpExpiryTime } = generateOTP();
        const user = {
          name: name,
          email: email,
          password: password,
          avatar: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          otp,
          otpExpiryTime,
        };

        await User.create(user);

        try {
          await sendMail({
            email: user.email,
            subject: "Verify your account",
            message: `Hello ${user.name}, please use this OTP to verify your account: ${otp}`,
          });
          res.status(201).json({
            success: true,
            message: `Please check your email: ${user.email} to verify your account!`,
          });
        } catch (error) {
          throw new ErrorHandler(error.message, 500);
        }
      } else {
        // Handle other potential errors
        return next(new ErrorHandler(error.message, 500));
      }
    }
  } catch (error) {
    console.error("Error creating user document:", error);
    next(error);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { otp, email } = req.body;

    if (!email || !otp) {
      return next(new ErrorHandler("Required field", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandler("User doesn't exist!", 400));
    }

    if (user.otp !== otp) {
      return next(new ErrorHandler("Invalid Otp"));
    }

    if (user.otpExpiryTime < new Date()) {
      return next(new ErrorHandler("Otp expired"));
    }

    if (user.isVerified === true) {
      throw new Error("Email already verified");
    }

    await User.findOneAndUpdate(
      { email: { $like: user.email } },
      { isVerified: true },
      { new: true, upsert: true, lean: true }
    );
    res.status(201).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

router.post("/send-otp", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler("Required field", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler("User doesn't exist!", 400));
    }

    if (user.isVerified) {
      throw new Error("User already verified");
    }

    const { otp, otpExpiryTime } = generateOTP();

    const use = await User.findOneAndUpdate(
      { email: { $like: user.email } },
      { otp, otpExpiryTime },
      { new: true, upsert: true, lean: true }
    );

    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please use this OTP to activate your account: ${otp}`,
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      // const user = await userCollection.get(req.user.id);

      const { password } = req.body;

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.content.password
      );

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      const newDoc = {
        id: user.content.id,
        name: req.body.name ? req.body.name : user.content.name,

        email: req.body.email ? req.body.email : user.content.email,
        password: req.body.password
          ? await bcrypt.hash(req.body.password, 10)
          : user.content.password,
      };

      /* Persist updates with new doc */
      //      await userCollection.replace(user.content.id, newDoc);

      //  const updatedUser = await userCollection.get(req.user.id);

      res.status(201).json({
        success: true,
        user: updatedUser.content, // Send the updated user data in the response
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put(
  "/update-avatar",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await userCollection.get(req.user.id);
      if (req.body.avatar !== "") {
        const imageId = user.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: "avatars",
          width: 150,
        });

        user.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      //  await userCollection.upsert(user.content.id, user);

      res.status(200).json({
        success: true,
        message: "Profile updated",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");
      console.log(user);

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find();
      res.status(200).json({
        success: true,
        users: users.rows,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }

      const imageId = user.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      await User.removeById(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
