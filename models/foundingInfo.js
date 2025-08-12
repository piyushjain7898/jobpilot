const { url } = require("inspector");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const foundingSchema = new Schema({
    organizationName:String ,
    industryType: String,
    vistion : String,
    date: Date,
    teamSize: Number,
    companyWebsite : String,
})

const Founding = mongoose.model("Founding" , foundingSchema);
module.exports = Founding;
