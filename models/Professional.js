const mongoose = require("mongoose");
const professionalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  fromGoogle: {
    type:Boolean,
    default:false
  },
  password: {
    type: String,
    required: function(){
      if(this.fromGoogle){
          return false;
      }
      return true;
  }
  },
  qualification: {
    type: String,
  },
  about: {
    type: String,
  },
  chargesbc: {
    type: Number,
    required: true,
  },
  skills: [
    {
      "skill_Id":{
        type: mongoose.Schema.ObjectId,
        ref: "Skill", 
      },
      "skill_chargePM":{
        type: Number
      }
    },
  ],
  mobileno: {
    type: Number,
  },

  imagepath: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  totalStars: {
    type: Number,
    default: 0,
  },
  active_status: {
    type: Boolean,
    default: false,
  },
  token: {
    type:String,
    default:""
  },
  isVerified: {
    type: Boolean,
    default: false 
  }
},{timestamps:true});

const professionalModal = mongoose.model("Professional", professionalSchema);
module.exports = professionalModal;
