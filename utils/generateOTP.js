const generateOTP = () => {
  const otp = Math.floor(Math.random() * 9000000) + 100000;
  const otpExpiryTime = new Date();
  otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10);
  return { otp, otpExpiryTime };
};

module.exports = generateOTP;
