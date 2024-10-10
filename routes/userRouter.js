const Router = require("express");
const router = Router();
require("../passport");
const passport = require("passport");
const session = require('express-session');
router.use(session({
  secret: 'Secret_key',
  resave: false,
  saveUninitialized: false,
}));
router.use(passport.initialize());
router.use(passport.session());
// const { verifyToken } = require("../utils/tokenUtils");
const {
  getAllUsers,
  register,
  verifyEmail,
  recharge,
  login,
  logout,
  updateUserProfile,
  getProfile,
  getBalance,
  getUserSessions,
  getUserTransactions,
  getBookingHistory,
  getUserReviews,
  postreview,
  deletereview,
  editreview,
  GoogleLoginUser,
  updatepassword,
  forgetpassword,
  resetpassword,
  saveNotification,
  getNotification,
  getSubcategoryLevel1Que,
  getSubcategoryLevel2Que,
  saveLevel1que,
  saveLevel2que,
} = require("../controllers/userController");
const { authenticateUser } = require("../middleware/authMiddleware");
const {
  generateSession,
  updateSessionSchedule,
  generateTransaction,
} = require("../middleware/sessionMiddleware");
const { createTransaction } = require("../middleware/paymentMiddleware");
const { isBalanceSufficient } = require("../middleware/validationMiddleware");
const { bookPsychologist } = require("../controllers/psychologistController");

router.route("/").get(getAllUsers);
router.route("/profile").get(getProfile);
router.route("/register").post(register);
router.route("/verify").post(verifyEmail);
router.route("/login").post(login);

// This is for user Logout:
router.route("/logout").get(logout);
// This is for user update:
router.route("/update/:userId").post(authenticateUser, updateUserProfile);

//Login via Google
router.route("/google").post(GoogleLoginUser);

// Reviews:
router.post("/review", authenticateUser, postreview);
router.delete("/review/:userId", authenticateUser, deletereview);
router.put("/review/:userId", authenticateUser, editreview);

//for questions
router.route("/getLevel1Questions").get(getSubcategoryLevel1Que);
router.route("/getLevel2Questions").get(getSubcategoryLevel2Que);

//for saving the questoin of particular user:
router.route('/savequeLevel1').post(saveLevel1que);
router.route('/savequeLevel2').post(saveLevel2que);

router
  .route("/wallet")
  .post(authenticateUser, createTransaction, recharge)
  .get(authenticateUser, getBalance);
router
  .route("/book")
  .post(
    authenticateUser,
    isBalanceSufficient,
    generateTransaction,
    // generateSession,
    // updateSessionSchedule,
    bookPsychologist
  )
  .get(authenticateUser, getBookingHistory);
router.route("/sessions").get(authenticateUser, getUserSessions);
router.route("/transactions").get(authenticateUser, getUserTransactions);
router
  .route("/reviews")
  .get(authenticateUser, getUserReviews)
router.route("/updatepassword/:userId").post(authenticateUser, updatepassword );
// This is for psyc forgetpassword:
router.route("/forgetpassword").post(forgetpassword);
router.route("/resetpassword").post(resetpassword);
// For notification 
router.route("/notification").post(saveNotification);
router.route("/notification").get(getNotification);


  module.exports = router;
