const { BadRequestError, NotFoundError } = require("../errors/customErrors");
const UserModel = require("../models/UserModel");
const { createJWT } = require("../utils/tokenUtils");
const statusCodes = require("http-status-codes");


/*

//login via google
const validateGoogleRegistration = async (req, res, next) => {

  const email = req.user.email;

  const requestedUser = await UserModel.findOne({ email: email });

  const requestedPsy = await PsychologistModel.findOne({ email: email });

  if (requestedUser ||  requestedPsy) {
    //for setting up token with cookie
    const user = requestedUser;
    const obj = {
      userId: user._id,
      role: requestedUser ? "USER" : "PSYC",
    };
    const token = createJWT(obj);
    const oneDay = 1000 * 60 * 60 * 24;
    return res
      .status(StatusCodes.ACCEPTED)
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + oneDay),
        secure: process.env.NODE_ENV === "production",
      })
      .json({ msg: "Logged In Successfully", token });

  }
  const fromGoogle = true;
  

  const obj = {
    userId: user._id,
    role: requestedUser ? "USER" : "PSY",
  };
  const token = createJWT(obj);
  const oneDay = 1000 * 60 * 60 * 24;
  return res
    .status(statusCodes.ACCEPTED)
    .cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + oneDay),
      secure: process.env.NODE_ENV === "production",
    })
    .json({ msg: "Logged In Successfully", token });
};
*/

//middleware to check if the balance is sufficient or not
const isBalanceSufficient = async (req, res, next) => {
  console.log("isBalanceSufficientMiddleware");
  const {cod} = req.body;
  if(!cod){
    try {
      const user = await UserModel.findById(req.body.userId);
      const currentBalance = user.walletBalance;
      const bookingAmt = req.body.bookingAmount;
      if (currentBalance < bookingAmt)
        throw new BadRequestError("Insufficient Balance");
      user.walletBalance = user.walletBalance - bookingAmt;
      req.body.closingBalance = user.walletBalance;
      await user.save();
      next();
    } catch (e) {
      console.log(error);
      return res.status(500).json({ msg: e.message });
    }
  }else{
    console.log("COD OPTED")
    next();
  }
};

module.exports = {
  isBalanceSufficient,
};
