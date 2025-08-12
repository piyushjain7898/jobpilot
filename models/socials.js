const mongoose = require("mongoose");

const socialSchema = new mongoose.Schema({
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String
});

module.exports = mongoose.model("Social", socialSchema);
