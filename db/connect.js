const mongoose = require("mongoose");

uri =
  "mongodb+srv://officialaneesansari:r7GGFYL6hQoGY6cn@cluster0.gzxf7iw.mongodb.net/ServuDB";

const connectDB = async () => {
  try {
    console.log("Connecting to the Database");
    const obj = await mongoose.connect(uri);
    console.log("connected to mdb");
    return obj;
  } catch (error) {
    console.log(error);
    return error;
  }
};
module.exports = connectDB;
