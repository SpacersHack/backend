const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");
const generateOTP = require("../utils/generateOTP");

// create shop
router.post(
  "/create-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;
      try {
        const sellerEmail = await Shop.findOne({ email });
        console.log(sellerEmail);

        if (sellerEmail) {
          return next(
            new ErrorHandler("User with this email already exists", 400)
          );
        }
      } catch (error) {
        if (error.name === "DocumentNotFoundError") {
          // const myCloud = await cloudinary.v2.uploader.upload(
          //   req.body?.avatar,
          //   {
          //     folder: "avatars",
          //   }
          // );

          //  const { otp, otpExpiryTime } = generateOTP();

          const seller = {
            name: req.body.name,
            email: email,
            password: req.body.password,
            // avatar: {
            //   public_id: myCloud.public_id,
            //   url: myCloud.secure_url,
            // },
            address: req.body.address,
            description: req.body.description,
            // otp,
            // otpExpiryTime,
          };

          const shop = await Shop.create(seller);
          res.status(201).json({
            success: true,
            message: "Shop successfully created",
            shop,
          });
        } else {
          return next(new ErrorHandler(error.message, 500));
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { otp, email } = req.body;

    if (!email || !otp) {
      return next(new ErrorHandler("Required field", 400));
    }

    const user = await Shop.findOne({ email }, { lean: true });

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

    await Shop.findOneAndUpdate(
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

    const user = await Shop.findOne({ email });

    if (!user) {
      return next(new ErrorHandler("User doesn't exist!", 400));
    }

    if (user.isVerified) {
      throw new Error("User already verified");
    }

    const { otp, otpExpiryTime } = generateOTP();

    const use = await Shop.findOneAndUpdate(
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

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email });

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      // Check if the user is blocked
      if (user.isBlocked) {
        return next(
          new ErrorHandler("Account blocked, please contact the admin", 403)
        );
      }

      // Check if the user is not verified
      // if (!user.isVerified) {
      //   return next(
      //     new ErrorHandler(
      //       "Account not verified, please verify your account",
      //       403
      //     )
      //   );
      // }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const seller = await Shop.findById(req.seller.id);
    try {
      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
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

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
// router.put(
//   "/update-shop-avatar",
//   isSeller,
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       let existsSeller = await Shop.findById(req.seller._id);

//       const imageId = existsSeller.avatar.public_id;

//       await cloudinary.v2.uploader.destroy(imageId);

//       const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
//         folder: "avatars",
//         width: 150,
//       });

//       existsSeller.avatar = {
//         public_id: myCloud.public_id,
//         url: myCloud.secure_url,
//       };

//       await existsSeller.save();

//       res.status(200).json({
//         success: true,
//         seller: existsSeller,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   })
// );

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address } = req.body;

      const shop = await Shop.findById(req.seller.id, { lean: true });

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }
      const ShopData = {
        name: name,
        description: description,
        address: address,
      };

      const resp = await Shop.findOneAndUpdate(
        { email: { $like: shop.email } },
        { ...ShopData },
        { new: true, upsert: true, lean: true }
      );

      res.status(201).json({
        success: true,
        shop: resp,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find();
      res.status(201).json({
        success: true,
        sellers: sellers.rows,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      await Shop.removeById(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
