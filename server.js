const express = require("express");
const app = express();
const cloudinary = require("cloudinary");
const ErrorHandler = require("./middleware/error");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const { databaseConnection } = require("./db/database");

app.use(
  cors({
    origin: ["https://farm-cart.vercel.app", "http://localhost:3001"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// Handling uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling uncaught exception`);
});

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// connect db
databaseConnection();
app.get("/test", (req, res) => {
  res.status(200).json({ status: "success" });
});

const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const conversation = require("./controller/conversation");
const message = require("./controller/message");
const withdraw = require("./controller/withdraw");

app.use("/api/v2/user", user);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/order", order);
app.use("/api/v2/payment", payment);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Unknown routes
app.all("*", (req, res, next) => {
  console.log(`Route ${req.originalUrl} not found`);
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

// it's for ErrorHandling
app.use(ErrorHandler);

// Create the server after defining routes and middleware
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandled promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
