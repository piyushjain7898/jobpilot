const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    company_logo: String,
    banner_image: String,
    company_name: String,
    about_us: String
});

module.exports = mongoose.model("Company", companySchema);
