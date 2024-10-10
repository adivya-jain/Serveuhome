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
const {
  bookPsychologist,
  register,
  verifyEmail,
  login,
  logout,
  GoogleLoginPsyc,
  getPsychologistList,
  getProfile,
  getSchedule,
  updateSlot,
  updateProfile,
  fetchSessionsPsyc,
  getReviews,
  getRating,
  updatePsycProfile,
  updatepassword,
  forgetpassword,
  resetpassword,
  sessionupdate,
  category,
  subcategory,
  subcategoryLevel2,
  skill,
  getcategories,
  getSubcategories,
  getSubcategoriesLevel2,
  skillRegister,
  getSkills,
  saveLevel1que,
  saveLevel2que,
  deleteQuestionLevel1,
  deleteQuestionLevel2,
} = require("../controllers/psychologistController");
// const { verifyToken } = require("../utils/tokenUtils");
const { authenticateUser } = require("../middleware/authMiddleware");

router.route("/register").post(register);
router.route("/verify").post(verifyEmail);
router.route("/").get(getPsychologistList);
router.route("/profile").get(getProfile).patch(updateProfile);
router.post("/login", login);
router.route("/schedule").get(getSchedule).post(updateSlot);

//getcategories
router.route("/getcategory").get(getcategories);
//getcategories
router.route("/getsubcategory").get(getSubcategories);
//getcategoriesLevel2
router.route("/getsubcategory2").get(getSubcategoriesLevel2);

// post categories
router.route("/category").post(category);
// post subcategories
router.route("/subcategory").post(subcategory);
// post subcategoriesLevel2
router.route("/subcategorylevel2").post(subcategoryLevel2);
// post skill
router.route("/skill").post(skillRegister);
//get skill
router.route("/getSkill").post(getSkills)
//updateque
router.route("/update1").post(saveLevel1que);
router.route("/update2").post(saveLevel2que);
//deleteque
router.route("/delete1").post(deleteQuestionLevel1);
router.route("/delete2").post(deleteQuestionLevel2);

//fetch Session for a psycologist:
router.route("/sessions").get(fetchSessionsPsyc);
router.get("/reviews", getReviews);
router.get("/rating", getRating);
//Login via Google
router.route("/google").post(GoogleLoginPsyc);
// This is for psyc profile update:
router.route("/update/:psycId").post(authenticateUser, updatePsycProfile);
// This is for psyc Logout:
router.route("/logout").get(logout);
// This is for psyc updatepassword:
router.route("/updatepassword/:psycId").post(authenticateUser, updatepassword );
// This is for psyc forgetpassword:
router.route("/forgetpassword").post(forgetpassword);
router.route("/resetpassword").post(resetpassword);
// This is for psyc session update:
router.route("/sessionupdate/:psycId/:sessionId").post(authenticateUser, sessionupdate);



module.exports = router;
