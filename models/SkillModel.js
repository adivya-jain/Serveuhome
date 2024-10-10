const mongoose = require("mongoose");
const { Skills } = require("../utils/constants");
const SkillSchema = new mongoose.Schema({

    skillTitle :{
        type: String,
        required: true,
    },
    skillDesc : {
        type: String,
        required: true,
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
    noSubcategoryLevel2:{
        type: Boolean,
        default: function(){
            if(this.Subcategory2Id){
                return false;
            }
            return true;
        }
    }
},{timestamps:true});

const skillModal = mongoose.model("Skill", SkillSchema);
module.exports = skillModal;
