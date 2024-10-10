const mongoose = require("mongoose");
const { Category } = require("../utils/constants");
const CategorySchema = new mongoose.Schema({
    categoryName: {
        type:String,
        required: true
    },
    categoryImage : {
        type:String,
    },
    categoryDesc : {
        type:String,
    },
},{timestamps:true});

const categoryModal = mongoose.model("Category", CategorySchema);
module.exports = categoryModal;
