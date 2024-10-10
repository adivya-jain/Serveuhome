const mongoose = require("mongoose");
const SubcategoryLevel2Schema = new mongoose.Schema({
    subCategoryName: {
        type:String,
        required: true
    },
    categoryImage : {
        type:String,
        required: true
    },
    categoryDesc : {
        type:String,
    },
    subcategoryId : {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "Subcategory", 
    },
    questions: [
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

const SubcategoryLevel2Modal = mongoose.model("SubcategoryLevel2", SubcategoryLevel2Schema);
module.exports = SubcategoryLevel2Modal;
