// models/contactInfo.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
    map_location: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
});

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;
