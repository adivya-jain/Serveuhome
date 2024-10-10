const { Double } = require("mongodb");
const mongoose = require("mongoose");

const ReviewsModelSchema = new mongoose.Schema({
  psychologistId: {
    type: mongoose.Types.ObjectId,
    ref: "PsychologistModel",
    required: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  stars: {
    type: Number,
    required: true,
  },
  review: {
    type: String,
  },
  postedAt: {
    type: Date,
    default: Date.now(),
  },
});

const ReviewModel = mongoose.model("Review", ReviewsModelSchema);
module.exports = ReviewModel;
