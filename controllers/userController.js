const UserModel = require("../models/UserModel");
//const ReviewsModel = require("../models/ReviewsModel");
const WalletTransactionsModel = require("../models/WalletTransactionsModel");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
  UnauthorizedError,
} = require("../errors/customErrors");
const { errorHandler } = require('../errors/error');
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { createJWT, verifyJWT } = require("../utils/tokenUtils");
const user_services = require("../services/user_services");
const StatusCodes = require("http-status-codes");
const BookingModel = require("../models/BookingModel");
const ReviewModel = require("../models/ReviewsModel");
const SessionModel = require("../models/SessionModel");
const {sendMailUser, SendMailVerifyEmail} = require("../services/mailingService");
const randomstring = require('randomstring');
const Notification = require("../models/NotificationModal");
const professionalModal = require("../models/Professional");
const SubcategoryModal = require("../models/Subcategory");
const SubcategoryLevel2Modal = require("../models/SubCategoryLevel2");
const QuestionModel = require("../models/QuestionModel");

//const stripe = require("stripe")(process.env.STRIPE_SECRET);
//login user with email only
const login = async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });
  if(!user.isVerified){
    return next(errorHandler(403, "Your account is not verified yet! Please verify you email."))
  }
  const isValidUser =
    user && (await comparePassword(req.body.password, user.password));
  if (!isValidUser)
    return next(new UnauthenticatedError("invalid credentials"));

  const token = createJWT({
    userId: user._id,
    role: "USER",
    imageURL: user.imagePath,
  });
  const oneDay = 1000 * 60 * 60 * 24;
  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === "production",
  });
  //res.status(StatusCodes.OK).json({ 
    //user,
    //msg: "user logged in" 
    res.send(user)
    //res.StatusCodes(201)
  //});
  console.log(token);
};

//fetch the list of all users
const getAllUsers = async (req, res) => {
  try {
    const myUsers = await UserModel.find(req.query);
    res.status(200).json({ myUsers });
  } catch (error) {
    throw error;
  }
};

//register user
const register = async (req, res, next) => {

  const {username, email,address, password, mobileno } = req.body;
  try {
    const existingUser = await UserModel.findOne({ email });
    if(existingUser){
      return  next(errorHandler(400, "User Already exists!"));
    }
    const hashedPassword = await hashPassword(password);
    if (req.query.referralId) {
      const referrer = await UserModel.findById(req.query.referralId);
      if (referrer) {
        req.body.walletBalance = 100;
        referrer.walletBalance += 100;
        await referrer.save();
      } else {
        return next(new BadRequestError("Invalid Referral ID"));
      }
    }
    if(username === ""){
      return res.status(StatusCodes.NotFoundError).json({message: 'Please enter Name'});
    } else if (email === ""){ 
      return res.status(StatusCodes.NotFoundError).json({message: 'Please enter email'})
    } else if (password === ""){
      return res.status(StatusCodes.NotFoundError).json({message: 'Please enter password'})
    }
    const token = Math.floor(100000 + Math.random() * 900000);
    const newUser = new UserModel({
      name:username,
      email,
      password: hashedPassword,
      mobileno,
      token,
    });
    await newUser.save();
    SendMailVerifyEmail(newUser.name, newUser.email, token);
    const {password: pass, ...rest} = newUser._doc;
    res.status(200).json({
      message:"Registration Successfull! An OTP has been sent to your email. Verify by entering the OTP",
      rest
    });
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
};

//verify user email:
const verifyEmail = async(req, res, next)=>{
  try {
    const {token, email} = req.body;
  const validUser = await UserModel.findOne({token});
  if(!validUser){
    const user = await UserModel.updateOne(
      {email},
      {$set: {token:""}},
      {new:true}
    );
    return next(errorHandler(403, 'Invalid OTP Entered. You have to verify again'));
  }else{
    const user = await UserModel.findByIdAndUpdate(
      {
        _id: validUser._id
      },
      {
        $set: {
          token:"",
          isVerified: true,
        }
      },
      {new:true}
    );
    return res.status(200).json({
      success: true,
      message: "Your Account has been verified Successfully! Please Login",
    });
  }
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
  
}



//Login user via Google: 

const GoogleLoginUser = async (req, res, next) => {
  try {
    const { email, username, photoUrl} = req.body;
    const requestedUser = await UserModel.findOne({ email });
    //if user already registered
    if (requestedUser) {      
      //for setting up token with cookie
      const user = requestedUser;      
      const obj = {
        userId: user._id,
        role: "USER",
      };
      const {password, ...rest} = user._doc;
      const token = createJWT(obj);
      const oneDay = 1000 * 60 * 60 * 24;
      return res
        .status(StatusCodes.ACCEPTED)
        .cookie("token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + oneDay),
          secure: process.env.NODE_ENV === "production",
        })
        .json({ msg: "User Logged In Successfully", token, rest });
    }
    // if user is not registered
    const newUser = new UserModel({
      name: req.body.username, 
      email: req.body.email,
      imagePath: req.body.photoUrl,
      fromGoogle: true,
    });
    await newUser.save();
    const token = createJWT({
      userId: newUser._id,
      role: "USER",
      imageURL: newUser.imagePath,
    });
    const oneDay = 1000 * 60 * 60 * 24;
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + oneDay),
      secure: process.env.NODE_ENV === "production",
    });
    // res.send(newUser)
    const {password, ...rest} = newUser._doc;
    return res
      .status(StatusCodes.ACCEPTED)
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + oneDay),
        secure: process.env.NODE_ENV === "production",
      })
      .json({ msg: "User Logged In Successfully", token, rest });
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
};

//forget password:
const forgetpassword= async( req, res, next)=>{
  try {
    const {email} = req.body;
    const validUser = await UserModel.findOne({email});
    if(!validUser){
      return next(errorHandler(403, 'You are not registered!!! Please Register.'))
    }else{
      const token = Math.floor(100000 + Math.random() * 900000);
      const tokenUpdation = await UserModel.updateOne(
        {email},
        {$set:{token}},
        {new:true}
      );
      sendMailUser(validUser.name, validUser.email, token);
      res.status(200).json({
        message: "An OTP has been sent to your email. Change your password by entering the OTP",
        t: token
      });
    }
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
}

//reset password: 
const resetpassword = async(req, res, next) => {
  const {token, email} = req.body;
  const validUser = await UserModel.findOne({token});
  if(!validUser){
    const user = await UserModel.updateOne(
      {email},
      {$set: {token:""}},
      {new:true}
    );
    return next(errorHandler(403, 'Invalid OTP Entered. You have to verify again'));
  }else{
    const hashedPassword =await hashPassword(req.body.password);
    const user = await UserModel.findByIdAndUpdate(
      {
        _id: validUser._id
      },
      {
        $set: {
          password: hashedPassword, 
          token:""
        }
      },
      {new:true}
    );
    return res.status(200).json({
      success: true,
      message: "Password has been changed successfully!",
    })
  }
};



//update user profile:
const updateUserProfile = async( req , res, next) => {

  try {
    // console.log("Token: ", req.user);
    // console.log('req.user:', req.body.userId);
    // console.log('req.params.userId:', req.params.userId);

    if(req.body.userId !== req.params.userId) {
      return next(errorHandler(403, 'You are not allowed to make updation. Please aunthenticate yourself!'))
    }

    const { username, activestatus, imagePath } = req.body;
    const updateUser = await UserModel.findByIdAndUpdate(req.params.userId, {
      $set: {
        name: username,
        imagePath,
      }
          // set is going to check wheather the data is being changed otherwise it will simply ignore it
    }, {new: true});
    // console.log(updateUser);

    const {password, ...rest} = updateUser._doc;

    return res
    .status(StatusCodes.ACCEPTED)
    .json({ msg: "User Profile Updated Successfully", rest });

  } catch (error) {
    console.log(error);
    return next(errorHandler(403, "SOMETHING WENT WRONG IN UPDATION!!"));
  }

}

//for logging out the user or psychologist
const logout = (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  return res.status(StatusCodes.OK).json({ msg: "User logged out" });
};

//fetch user profile
const getProfile = async(req, res, next) => {
  try {
    const user = await UserModel.findById(req.query.userId);
    if (!user) return next(new BadRequestError("User does not exist"));

    const returnObj = {
      name: user.name,
      email: user.email,
      walletBalance: user.walletBalance,
      imagePath: user.imagePath,
    };

    res.status(StatusCodes.OK).json(returnObj);
  } catch (e) {
    next(new BadRequestError());
  }
};

//get user balance
const getBalance = async (req, res, next) => {
  const user = await UserModel.findById(req.body.userId);
  // console.log(user);
  if (!user) return next(new NotFoundError("User doesn't exists"));

  return res.status(StatusCodes.OK).json({
    walletBalance: user.walletBalance,
  });
};

//recharge wallet
const recharge = async (req, res) => {
  try {
    const id = req.body.userId;
    const user = await UserModel.findById(id);
    user.walletBalance += req.body.amount;
    await user.save();
    res.status(200).json(user.walletBalance);
  } catch (error) {
    throw error;
  }
};

//get all sessions of the user
const getUserSessions = async (req, res, next) => {
  try {
    if(Object.keys(req.query).length === 0){
      const {userId } = await req.body;
      const user = await UserModel.findById(userId);
      //user.sessionUpdator();
      await user.populate("sessions");
      return res.status(StatusCodes.OK).json(user.sessions);
    }else{
      if(req.query.psychologistId){
        const userSessions = await SessionModel.find({
          psychologistId: req.query.psychologistId,
          userId: req.body.userId,
        });
        return res.status(StatusCodes.OK).json(userSessions);
      }
      else if(req.query.sessionId){
        const userSessions = await SessionModel.find({
          _id:req.query.sessionId,
          userId: req.body.userId,
        });
        return res.status(StatusCodes.OK).json(userSessions);
      }
      else{
        return next(errorHandler(400, 'Something went WRONG!'))
      }
    }
  } catch (e) {
    return next(new BadRequestError(e.message));
  }
};

//forget password:
const updatepassword= async( req, res, next)=>{
  try {
    // console.log("Token: ", req.user);
    // console.log('req.user:', req.body.userId);
    // console.log('req.params.userId:', req.params.userId);

    if(req.body.userId !== req.params.userId) {
      return next(errorHandler(403, 'You are not allowed to make password change. Please aunthenticate yourself!'))
    }
    
    if(req.body.password){
        req.body.password =await hashPassword(req.body.password);
    }
    const user = await UserModel.findByIdAndUpdate(req.params.userId, {
      $set: {
        password: req.body.password,
      }
    }, {new: true});
    // console.log(updateUser);
    

    const {password, ...rest} = user._doc;

    return res
    .status(StatusCodes.ACCEPTED)
    .json({ msg: "User Password Updated Successfully", rest });

  } catch (error) {
    console.log(error);
    return next(errorHandler(403, "SOMETHING WENT WRONG IN UPDATION!!"));
  }

}

//get the transaction history of the user
const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const transactionHistory = await WalletTransactionsModel.find({
      userId,
    })
    .populate("professionalId")
    .sort("-date");
    res.status(200).json(transactionHistory);
  } catch (e) {
    return next(new BadRequestError(e.message));
  }
};

//get the booking history of the user
const getBookingHistory = async (req, res, next) => {
  try {
    const bookings = await BookingModel.find({ userId: req.body.userId })
    .populate("professionalId");
    return res.status(StatusCodes.OK).json(bookings);
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
};

//post review for a psychologist
const postreview = async (req, res, next) => {
 
  try {
     /* 
    const previousReview = await ReviewModel.findOne({
      userId: req.body.userId,
      psychologistId: req.body.psychologistId,
    });
    if (previousReview) {
      return next(new BadRequestError("Review already exists"));
    }
    */
    const review = await ReviewModel.create(
      {
        userId: req.body.userId,
        psychologistId: req.body.psychologistId,
        stars: req.body.stars,
        review: req.body.review,
      }
    );
    await review.save();

    const psychologist = await professionalModal.findById(
      req.body.psychologistId
    );
    psychologist.totalStars += req.body.stars;

    psychologist.totalReviews++;

    await psychologist.save();

    return res
      .status(StatusCodes.OK)
      .json({ message: "Review is created successfully", review });
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
};


//delete a review
const deletereview = async (req, res, next) => {
  try {
    const reviewId = req.query.reviewId;
    const review = await ReviewModel.findById(reviewId);
    if (!review) return next(new BadRequestError("Review Doesn't exists"));
    if (review.userId.toString() !== req.params.userId) {
      return next(new UnauthorizedError("You are not allowed to delete this review!!"));
    }
    const psychologist = await professionalModal.findById(
      review.psychologistId
    );
    psychologist.totalReviews--;
    psychologist.totalStars -= review.stars;
    await psychologist.save();
    const deletedReview = await ReviewModel.findByIdAndDelete(reviewId);
    return res
      .status(StatusCodes.OK)
      .json({ message: "The review was deleted successfully", deletedReview });
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
};


//edit review of a user
const editreview = async (req, res, next) => {
  try {
    const reviewId = req.query.reviewId;

    const revieww = await ReviewModel.findById(reviewId);

    if (revieww.userId.toString() !== req.params.userId) {
      return next(new UnauthorizedError("You are not allowed to delete this review!!"));
    }

    const { stars, review } = req.body;
    const psychologist = await professionalModal.findById(
      revieww.psychologistId
    );

    psychologist.totalStars -= revieww.stars;
    psychologist.totalStars += stars;

    revieww.stars = stars;
    revieww.review = review;
    await revieww.save();

    await psychologist.save();
    
    return res
      .status(StatusCodes.OK)
      .json({ message: "Review was updated successfully", revieww });
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
};

//fetch the reviews of user
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await ReviewModel.find({ userId: req.body.userId });
    return res.status(StatusCodes.OK).json(reviews);
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
};

// to save notification 
const saveNotification = async(req, res, next) => {
  const { userId, psychologistId, message, title } = req.body;
  try {
    const notification = new Notification({
      userId,
      psychologistId, 
      message,
      title,
    });
    await notification.save();
    res.status(200).json({
      message: "Notification saved successfully!",
      notification,
    });
  } catch (error) {
    return next(new BadRequestError(error.message));
  }
}

//getnotification: 
const getNotification = async (req, res) => {
  const { userId, psychologistId } = req.query;
  try {
    const userNotifications = await Notification.find({ 
      userId, 
    });
    const psycNotifications = await Notification.find({ 
      psychologistId, 
    });

    res.status(200).json({userNotifications, psycNotifications});
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

//get level 1 questions:
const getSubcategoryLevel1Que = async (req, res, next) => {
  try {
    const subcategoryId = req.query.subcategoryId;
    const questions = await SubcategoryModal.find({ _id:subcategoryId });

    if (!questions || questions.length === 0) {
      return res.status(403).json("No questions found for this subcategory");
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

//get level 2 questions:
const getSubcategoryLevel2Que = async (req, res, next) => {
  try {
    const subcategoryId = req.query.subcategoryId;
    const questions = await SubcategoryLevel2Modal.find({ _id:subcategoryId });

    if (!questions || questions.length === 0) {
      return res.status(403).json("No questions found for this subcategory");
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

//save questoin level1
const saveLevel1que = async (req, res, next) => {
  try {
    const { userId, categoryId, SubcategoryId, questionLevel1 } = req.body;
    
    let question = await QuestionModel.findOne({
      userId
    });

    if (!question) {
      question = new QuestionModel({
        userId,
        categoryId,
        SubcategoryId,
        questionLevel1,
      });
      await question.save();
    } else {
      question.questionLevel1 = [...question.questionLevel1, ...questionLevel1];
    }

    await question.save();

    return res.status(200).json({
      message: "Question saved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

//save questoin level2
const saveLevel2que = async (req, res, next) => {
  try {
    const { userId, categoryId, Subcategory2Id, questionLevel2 } = req.body;
    
    let question = await QuestionModel.findOne({
      userId,
    });

    if (!question) {
      question = new QuestionModel({
        userId,
        categoryId,
        Subcategory2Id,
        questionLevel2,
      });
      await question.save();
    } else {
      question.questionLevel2 = [...question.questionLevel2, ...questionLevel2];
    }

    await question.save();

    return res.status(200).json({
      message: "Question saved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


module.exports = {
  getAllUsers,
  register,
  verifyEmail,
  logout,
  login,
  updateUserProfile,
  recharge,
  getProfile,
  getBalance,
  getUserSessions,
  getUserTransactions,
  getBookingHistory,
  getUserReviews,
  postreview,
  editreview,
  deletereview,
  GoogleLoginUser,
  updatepassword,
  forgetpassword,
  resetpassword,
  saveNotification,
  getNotification,
  getSubcategoryLevel1Que,
  getSubcategoryLevel2Que,
  saveLevel1que,
  saveLevel2que
};
