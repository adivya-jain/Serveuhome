const mongoose = require('mongoose');
const moment = require("moment-timezone");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'UserModel', 
            required: function(){
                if(this.psychologistId){
                    return false;
                }
                return true;
            }
        },
        psychologistId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'PsychologistModel', 
            required: function(){
                if(this.userId){
                    return false;
                }
                return true;
            }
        },
        title: {
            type: String, 
            required: true 
        },
        message: { 
            type: String, 
            required: true 
        },
        createdAt: {
          type: String,
          default: () => moment().tz("Asia/Kolkata").format(),
        },
        isRead: { 
            type: Boolean, 
            default: false 
        },
    }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
