const mongoose = require("mongoose");
const SessionModel = require("./SessionModel");
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "email is necessary"],
  },
  mobileno:{
    type:Number,
  },
  address: [
    {
      "address" : {
        type: String,
      },
      "geoLocation":{
        type: String,
      }
    }
  ],
  activestatus: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
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
  walletBalance: {
    type: Number,
    default: 0,
  },
  sessions: [{ type: mongoose.Types.ObjectId, ref: SessionModel }],
  imagePath: {
    type: String,
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

UserSchema.methods.updator = async function () {
  const currentDate = Date.now();
  console.log(this);
  await this.populate("sessions");
  this.sessions.filter((session) => {
    return session.date >= currentDate;
  });
  return await this.save();
};

const UserModel = mongoose.model("User", UserSchema);
module.exports = UserModel;
