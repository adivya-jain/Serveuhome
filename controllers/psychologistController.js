const { StatusCodes } = require("http-status-codes");
const BookingModel = require("../models/BookingModel");
const ScheduleModel = require("../models/ScheduleModel");
const { createJWT, verifyJWT } = require("../utils/tokenUtils");
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { slotTimings, Category, SubCategory, SubCategoryLevel2, Skills } = require("../utils/constants");
const { errorHandler } = require('../errors/error.js');
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../errors/customErrors");
const SessionModel = require("../models/SessionModel");
const ReviewModel = require("../models/ReviewsModel");
const UserModel = require("../models/UserModel");
const randomstring = require('randomstring');
const {sendMailPsyc, SendMailVerifyEmail} = require("../services/mailingService");
const professionalModal = require("../models/Professional.js");
const categoryModal = require("../models/Categories.js");
const SubcategoryModal = require("../models/Subcategory.js");
const SubcategoryLevel2Modal = require("../models/SubCategoryLevel2.js");
const skillModal = require("../models/SkillModel.js");


//register psychologist
const register = async (req, res, next) => {
  const {username, email, password, qualification, about, mobileno, chargesbc, skills } = req.body;
  try {
    const existingUser = await professionalModal.findOne({ email });
    if(existingUser){
      return  next(errorHandler(400, "Psychologist Already exists!"));
    }
    const hashedPassword = await hashPassword(password);
    if (req.query.referralId) {
      const referrer = await professionalModal.findById(req.query.referralId);
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
    const newPsyc = new professionalModal({
      name:username,
      email,
      password: hashedPassword,
      qualification,
      about,
      chargesbc,
      skills,
      mobileno,
      token,
    });
    await newPsyc.save();
    SendMailVerifyEmail(newPsyc.name, newPsyc.email, token);
    const {password: pass, ...rest} = newPsyc._doc;
    res.status(200).json({
      message:"Registration Successfull! An OTP has been sent to your email. Verify by entering the OTP",
      rest
    });
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
};


//verify psyc email:
const verifyEmail = async(req, res, next)=>{
  try {
    const {token, email} = req.body;
    const validPsyc = await professionalModal.findOne({token});
    if(!validPsyc){
      const user = await professionalModal.updateOne(
        {email},
        {$set: {token:""}},
        {new:true}
      );
      return next(errorHandler(403, 'Invalid OTP Entered. You have to verify again'));
    }else{
      const psyc = await professionalModal.findByIdAndUpdate(
        {
          _id: validPsyc._id
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


//login psychologist
const login = async (req, res, next) => {
  const user = await professionalModal.findOne({ email: req.body.email });
  if(!user.isVerified){
    return next(errorHandler(403, "Your account is not verified yet! Please verify you email."))
  }
  const isValidUser =
    user && (await comparePassword(req.body.password, user.password));
  if (!isValidUser)
    return next(new UnauthenticatedError("invalid credentials"));

  const token = createJWT({ userId: user._id, role: "PSY" });
  const oneDay = 1000 * 60 * 60 * 24;
  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === "production",
  });
  res.status(StatusCodes.OK).json({ msg: "psychologist logged in" , user});
};





//Login Psyc via Google: 

const GoogleLoginPsyc = async (req, res, next) => {

  try {
    const {email, username, photoUrl} = req.body;
    const requestedPsyc = await professionalModal.findOne({ email });
    //if user already registered
    if (requestedPsyc) {  
      //for setting up token with cookie
      const user = requestedPsyc;
      const obj = {
        userId: user._id,
        role: "PSYC",
      };
      const token = createJWT(obj);
      const oneDay = 1000 * 60 * 60 * 24;
      const {password, ...rest} = user._doc;
      return res
        .status(StatusCodes.ACCEPTED)
        .cookie("token", token, {
          httpOnly: true,
          expires: new Date(Date.now() + oneDay),
          secure: process.env.NODE_ENV === "production",
        })
        .json({ msg: "Psyc Logged In Successfully", token, rest });
    }
    // if Psyc is new 
    const newPsyc = new professionalModal({
      name: req.body.username, 
      email,
      imagepath: req.body.photoUrl,
      fromGoogle: true,
    });
    await newPsyc.save();
    const token = createJWT({
      userId: newPsyc._id,
      role: "PSYC",
      imageURL: newPsyc.imagepath,
    });
    const oneDay = 1000 * 60 * 60 * 24;
    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + oneDay),
      secure: process.env.NODE_ENV === "production",
    });
    // res.send(newPsyc)
    const {password, ...rest} = newPsyc._doc;
    return res
      .status(StatusCodes.ACCEPTED)
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + oneDay),
        secure: process.env.NODE_ENV === "production",
      })
      .json({ msg: "Psyc Logged In Successfully", token, rest });  
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
};

//post category
const category = async(req, res, next)=>{
  try {
    const {categoryName, categoryImage, categoryDesc } = req.body;
    const category = new categoryModal({

      categoryName,
      categoryImage,
      categoryDesc
    });
    await category.save();
    res.status(200).json(category);
    
  } catch (error) {
    res.status(500).json(error.message);
    console.log(error);
  }
}

//post subcategory
const subcategory = async(req, res, next)=>{
  try {
    const {subCategoryName, categoryDesc, categoryId, questions } = req.body;
    const subcategory = new SubcategoryModal({
      subCategoryName,
      categoryDesc,
      categoryId,
      questions
    });
    subcategory.populate("categoryId");
    await subcategory.save();
    res.status(200).json(subcategory);
    
  } catch (error) {
    res.status(500).json(error.message);
    console.log(error);
  }
}

//post subcategoryLevel2
const subcategoryLevel2 = async(req, res, next)=>{
  try {
    const {subCategoryName, categoryImage, categoryDesc, subcategoryId, questions } = req.body;
    const subcategoryLevel2 = new SubcategoryLevel2Modal({
      subCategoryName,
      categoryImage,
      categoryDesc,
      subcategoryId,
      questions
    });
    subcategoryLevel2.populate("subcategoryId");
    await subcategoryLevel2.save();
    res.status(200).json(subcategoryLevel2);
    
  } catch (error) {
    res.status(500).json(error.message);
    console.log(error);
  }
}


//save questoin level1
const saveLevel1que = async (req, res, next) => {
  try {
    const {SubcategoryId, question} = req.body;
      const updateque = await SubcategoryModal.findById(SubcategoryId);
      updateque.questions = [...updateque.questions, ...question];

    await updateque.save();

    return res.status(200).json({
      message: "Question saved successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

//save questoin level1
const saveLevel2que = async (req, res, next) => {
  try {
    const {SubcategoryId} = req.body;
      const updateque = await SubcategoryLevel2Modal.findById(SubcategoryId);
      updateque.questions = [...updateque.questions, ...question];

    await updateque.save();

    return res.status(200).json({
      message: "Question saved successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

const deleteQuestionLevel1 = async (req, res, next) => {
  try {
    const { SubcategoryId, questionId } = req.body;

    const subcategory = await SubcategoryModal.findById(SubcategoryId);

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    subcategory.questions = subcategory.questions.filter(
      (question) => question._id.toString() !== questionId
    );

    // Save the updated subcategory
    await subcategory.save();

    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteQuestionLevel2 = async (req, res, next) => {
  try {
    const { SubcategoryId, questionId } = req.body;

    const subcategory = await SubcategoryLevel2Modal.findById(SubcategoryId);

    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    subcategory.questions = subcategory.questions.filter(
      (question) => question._id.toString() !== questionId
    );

    // Save the updated subcategory
    await subcategory.save();

    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


//post skill
const skill = async(req, res, next)=>{
  try {
    const {categoryId, subcategoryId, subcategoryLevel2Id } = req.body;
    const skill = new skillModal({
      categoryId,
      subcategoryId,
      subcategoryLevel2Id,
    });
    skill.populate("categoryId");
    skill.populate("subcategoryId");
    skill.populate("subcategoryLevel2Id");
    await skill.save();
    res.status(200).json(skill);
    
  } catch (error) {
    res.status(500).json(error.message);
    console.log(error);
  }
}

//getCategories: 
const getcategories = async(req, res, next)=>{
  try {
    const categories = await categoryModal.find();

    res.status(200).json(categories);
  } catch (error) {
    res.status(200).json(error.message);
  }
}

//get SubCategories: 
const getSubcategories = async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId; 

    const subcategories = await SubcategoryModal.find({ categoryId }); 

    if (!subcategories || subcategories.length === 0) { 
      return res.status(404).json("Subcategories not found!");
    }

    res.status(200).json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error); 
    res.status(500).json({ error: "An error occurred while fetching subcategories." });
  }
}


//get SubCategoriesLevel2: 
const getSubcategoriesLevel2 = async(req, res, next)=>{
  try {
    const subcategoryId = req.query.categoryId; 

    const subcategoriesLevel2 = await SubcategoryLevel2Modal.find({ subcategoryId }); 

    if (!subcategoriesLevel2 || subcategoriesLevel2.length === 0) { 
      return res.status(404).json("Subcategories not found!");
    }

    res.status(200).json(subcategoriesLevel2);
  } catch (error) {
    console.error("Error fetching subcategories:", error); 
    res.status(500).json({ error: "An error occurred while fetching subcategories." });
  }
}


const skillRegister = async (req, res, next) => {
  try {
    const { skillTitle, skillDesc, skillCharge, categoryId, SubcategoryId, Subcategory2Id } = req.body;

    const skill = new skillModal({
      skillTitle,
      skillDesc,
      skillCharge,
      categoryId,
      SubcategoryId,
      Subcategory2Id
    });
    await skill.save();

    // await professionalModal.findByIdAndUpdate(
    //   profId,
    //   { $push: { skills: { skill_Id: skill._id, skill_chargePM: skillCharge } } },
    //   { new: true }
    // );

    return res.status(200).json({
      success: true,
      message: "Skill registered successfully.",
      skill: skill,
    });
  } catch (error) {
    console.error('Error registering skill:', error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering the skill.",
      error: error.message,
    });
  }
};

//get Skills: 
const getSkills= async(req, res, next)=>{
  const {SubcategoryId, Subcategory2Id} = req.body;
  try {
    let result;
    if(SubcategoryId && Subcategory2Id){
      result = await skillModal.find({
        SubcategoryId,
        Subcategory2Id
      });
    }else if(SubcategoryId){
      result = await skillModal.find({
        SubcategoryId,
        noSubcategoryLevel2: true
      });
    }else if(Subcategory2Id){
      result = await skillModal.find({
        Subcategory2Id
      });
    }

    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    })
  }
}

//session update:
const sessionupdate = async (req, res, next)=>{

  if(req.body.userId !== req.params.psycId) {
    return next(errorHandler(403, 'You are not allowed to make updation. Please aunthenticate yourself!'))
  }
  
  try {
    const sessionId = req.params.sessionId;
    const session = await SessionModel.findOneAndUpdate(
      {
        _id: sessionId
      },
      {
        $set:{
          meetLink: req.body.meetlink,
          sessionStatus: req.body.sessionStatus,
          slots: req.body.slot,
        },
      },
      { new: true }
    );
    if(!session){
      return next(errorHandler(404, 'You have no such session!!!'))
    }
    res.status(200).json({
      message: "Session updated Successfully",
      session
    });
  } catch (error) {
    next(new BadRequestError(`${error.message}`));
  }
}


//update psyc profile:
const updatePsycProfile = async( req , res, next) => {

  try {
    // console.log("Token: ", req.user);
    // console.log('req.user:', req.body.userId);
    // console.log('req.params.psycId:', req.params.psycId);

    if(req.body.userId !== req.params.psycId) {
      return next(errorHandler(403, 'You are not allowed to make updation. Please aunthenticate yourself!'))
    }
    const { username, mobileno, chargespm, about, disorders, qualification, imagepath } = req.body;
    const updatePsyc = await professionalModal.findByIdAndUpdate(req.params.psycId, {
      $set: {
        name: username,
        imagepath,
        mobileno,
        chargespm,
        about,
        qualification,
        disorders
      }
          // set is going to check wheather the data is being changed otherwise it will simply ignore it
    }, {new: true});
    // console.log(updatePsyc);

    const {password, ...rest} = updatePsyc._doc;

    return res
    .status(StatusCodes.ACCEPTED)
    .json({ msg: "Psyc Profile Updated Successfully", rest });

  } catch (error) {
    console.log(error);
    return next(errorHandler(403, "SOMETHING WENT WRONG IN UPDATION!!"));
  }

}


//update password:
const updatepassword= async( req, res, next)=>{
  try {
    // console.log("Token: ", req.user);
    // console.log('req.user:', req.body.userId);
    // console.log('req.params.userId:', req.params.userId);

    if(req.body.userId !== req.params.psycId) {
      return next(errorHandler(403, 'You are not allowed to make password change. Please aunthenticate yourself!'))
    }
    
    if(req.body.password){
        req.body.password =await hashPassword(req.body.password);
        const psyc = await psychologistModal.findByIdAndUpdate(req.params.userId, {
          $set: {
            password: req.body.password,
          }
        }, {new: true});
        // console.log(psyc);
        const {password, ...rest} = psyc._doc;
        return res
        .status(StatusCodes.ACCEPTED)
        .json({ msg: "User Password Updated Successfully", rest });
    }else{
      return next(errorHandler(403, "Please provide password"));
    }
    

  } catch (error) {
    console.log(error);
    return next(errorHandler(403, "SOMETHING WENT WRONG IN UPDATION!!"));
  }

}

//forget password:
const forgetpassword= async( req, res, next)=>{
  try {
    const {email} = req.body;
    const validUser = await professionalModal.findOne({email});
    if(!validUser){
      return next(errorHandler(403, 'You are not registered!!! Please Register.'))
    }else{
      const token = Math.floor(100000 + Math.random() * 900000);
      const tokenUpdation = await professionalModal.updateOne(
        {email},
        {$set:{token}},
        {new:true}
      );
      sendMailPsyc(validUser.name, validUser.email, token);
      res.status(200).json({
        message: "An OTP has been sent to your email. Change your password by entering the OTP.",
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
  const validUser = await professionalModal.findOne({token});
  if(!validUser){
    const psyc = await professionalModal.updateOne(
      {email},
      {$set: {token:""}},
      {new:true}
    );
    return next(errorHandler(403, 'Invalid OTP Entered. You have to verify again'));
  }else{
    const hashedPassword =await hashPassword(req.body.password);
    const psyc = await professionalModal.findByIdAndUpdate(
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

//get psychologist profile
const getProfile = async (req, res, next) => {
  try {
    const user = await professionalModal.findById(req.query.psychologistId);
    if (!user) return next(new BadRequestError("Psychologist does not exist"));
    /*const {
      name,
      qualifications,
      about,
      chargespm,
      disorders,
      mobileno,
      email,
      qualification,
      imagepath,
    } = user;
    const returnObj = {
      name,
      qualifications,
      about,
      chargespm,
      disorders,
      mobileno,
      email,
      qualification,
      imagepath,
    };*/

    //const result = delete user.password
    res.status(StatusCodes.OK).json(user);
  } catch (e) {
    next(new BadRequestError());
  }
};

//get list of all psychologists
const getPsychologistList = async (req, res, next) => {
  try {
    const data = await professionalModal.find({}).select("-password");
    next();
    res.status(200).json(data);
  } catch (error) {
    return next(new NotFoundError("Couldn't fetch psychologist list"));
  }
};

//for logging out the psychologist
const logout = (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  return res.status(StatusCodes.OK).json({ msg: "User logged out" });
};

// fetch the schedule of a psychologist on a particular date
const getSchedule = async (req, res) => {
  const { psychologistId, date } = req.query;
  //also needs middleware to verify psyId
  const schedule = await ScheduleModel.findOne({
    psychologistId: psychologistId,
    date: date,
  });

  const responseArray = slotTimings.map((time) => {
    if (schedule && schedule.slots.includes(time)) {
      return {
        time: time,
        available: false,
      };
    } else {
      return {
        time: time,
        available: true,
      };
    }
  });
  return res.status(StatusCodes.OK).json({ slots: responseArray });
};



//update slot of psychologist  (Aryan's FUNCTION  FOR TRIAL)
const updateSlot = async (req, res) => {
  const { psychologistId, date, slots, available } = req.body;
  //also needs middleware to verify psyId and authorization
  let schedule = await ScheduleModel.findOne({
    psychologistId: psychologistId,
    date: date,
  });
  if (!schedule) {
    schedule = ScheduleModel.create({
      psychologistId: psychologistId,
      date: date,
    });
  }
  console.log(schedule);
  if (available === false) {
    if (!schedule.slots.includes(slots)) {
      schedule.slots.push(slots);
    }
  } else {
    const index = schedule.slots.indexOf(slots);
    if (index !== -1) {
      schedule.slots.splice(index, 1);
    }
  }
  await schedule.save();
  const responseArray = slotTimings.map((time) => {
    if (schedule && schedule.slots.includes(time)) {
      return {
        time: time,
        available: false,
      };
    } else {
      return {
        time: time,
        available: true,
      };
    }
  });
  return res
    .status(StatusCodes.OK)
    .json({ msg: "Slot was updated successfully", slots: responseArray });
};


/*
//update slot of psychologist 
const updateSlot = async (req, res) => {
  const { psychologistId, date, slot, availability } = req.body;
  //also needs middleware to verify psyId and authorization
  let schedule = await ScheduleModel.findOne({
    psychologistId: psychologistId,
    date: date,
  });
  if (!schedule) {
    schedule = ScheduleModel.create({
      psychologistId: psychologistId,
      date: date,
    });
  }
  // console.log(schedule);
  if (availability === false) {
    if (!schedule.slots.includes(slot)) {
      schedule.slots.push(slot);
    }
  } else {
    const index = schedule.slots.indexOf(slot);
    if (index !== -1) {
      schedule.slots.splice(index, 1);
    }
  }
  await schedule.save();
  const responseArray = slotTimings.map((time) => {
    if (schedule && schedule.slots.includes(time)) {
      return {
        time: time,
        available: false,
      };
    } else {
      return {
        time: time,
        available: true,
      };
    }
  });
  return res
    .status(StatusCodes.OK)
    .json({ msg: "Slot was updated successfully", slots: responseArray });
};
*/

//update profile details of a psychologist
const updateProfile = async (req, res, next) => {
  const { psychologistId } = req.body;

  delete req.body.psychologistId;

  await professionalModal.findByIdAndUpdate(psychologistId, req.body);

  return res
    .status(StatusCodes.OK)
    .json({ msg: "Details were updated successfully" });
};

const bookPsychologist = async (req, res) => {
  console.log("bookPsychologist controller");

  try {
    const { userId, address, walletTransactionId, professionalId, bookingAmount, date, username, professionalname, userEmail } = req.body;
    const newBooking = new BookingModel({
      userId,
      professionalId,
      amount:bookingAmount,
      date,
      username,
      professionalname,
      userEmail,
      address,
    });
    await newBooking.save();
    const booking = await BookingModel.findById(newBooking._id)
    .populate("userId")
    .populate("professionalId");
    res.status(200).json({
      walletTransactionId,
      booking,
    });
  } catch (error) {
    throw error;
  }
};

//getnotification: 
const getNotifications = async (req, res) => {
  const userId = req.params.userId; // Adjust based on your route configuration

  try {
    const notifications = await Notification.find({ userId }).sort({ date: 'desc' });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

//on successful google login
const successGoogleLogin = (req, res) => {
  if (!req.user) res.redirect("/failure");
  res.status(200).json({ msg: `Welcome ${req.user.email}`, ...req.user });
};



//fetch all sessions of a Psycologist:
const fetchSessionsPsyc = async(req, res, next) => {
  try {
    const id = req.query.id;
    const sessions = await SessionModel.find({ psychologistId: id });
    res.status(StatusCodes.OK).json(sessions);
  } catch (error) {
    return next(new BadRequestError(e.message));
  }
};



//to fetch all the reviews of a psychologist
const getReviews = async (req, res, next) => {
  const reviews = await ReviewModel.find({
    psychologistId: req.query.psychologistId,
  }).sort("-postedAt");

  /*const users = await UserModel.find({
    userId: req.query.userId
  })*/
  return res.status(StatusCodes.OK).json(reviews);
};

//to fetch the average rating of a psychologist
const getRating = async (req, res, next) => {
  const psychologist = await professionalModal.findById(
    req.query.psychologistId
  );
  console.log(psychologist);
  if (psychologist.totalReviews === 0)
    return res.status(StatusCodes.OK).json({ rating: 0 });

  const rating = psychologist.totalStars / psychologist.totalReviews;

  return res.status(StatusCodes.OK).json({ rating: rating });
};
module.exports = {
  getPsychologistList,
  bookPsychologist,
  successGoogleLogin,
  GoogleLoginPsyc,
  logout,
  register,
  verifyEmail,
  login,
  updatePsycProfile,
  sessionupdate,
  getProfile,
  getSchedule,
  updateSlot,
  updateProfile,
  fetchSessionsPsyc,
  getRating,
  getReviews,
  getNotifications,
  updatepassword,
  forgetpassword,
  resetpassword,
  category,
  subcategory,
  subcategoryLevel2,
  skill,
  getcategories,
  getSubcategories,
  getSubcategoriesLevel2,
  skillRegister,
  getSkills,
  saveLevel2que,
  saveLevel1que,
  deleteQuestionLevel2,
  deleteQuestionLevel1
};
