require("dotenv").config();
const mongoose = require("mongoose");
mongoose
  // .connect(process.env.MONGO_URL_DEV)
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Db connected"))
  .catch((err) => console.log(err));
module.exports = mongoose;
