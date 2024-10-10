const mongoose = require("mongoose");
const SubcategorySchema = new mongoose.Schema({
    
    subCategoryName : {
        type:String,
        required: true
    },
    categoryDesc : {
        type:String,
    },
    imageUrl: {
        type:String,
    },
    categoryId : {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "Category", 
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

const SubcategoryModal = mongoose.model("Subcategory", SubcategorySchema);
module.exports = SubcategoryModal;
