const mongoose = require("mongoose");
const QuestionSchema = new mongoose.Schema({
    userId:{
        type:String,
        required:true,
    },
    categoryId : {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "Category", 
    },
    SubcategoryId : {
        type: mongoose.Schema.ObjectId,
        ref: "Subcategory", 
    },
    Subcategory2Id : {
        type: mongoose.Schema.ObjectId,
        ref: "SubcategoryLevel2", 
    },
    questionLevel1: [
        {
            question : {
                type: String,
            },
            selectedOption : {
                type: String,
            }
            
        }
    ],
    questionLevel2: [
        {
            question : {
                type: String,
            },
            options : [
                {
                    option : {
                        type: String,
                    }
                }
            ]
        }
    ],
},{timestamps:true});

const QuestionModel = mongoose.model("Question", QuestionSchema);
module.exports = QuestionModel;