const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Company = require("./models/companyInfo.js");
const Founding = require("./models/foundingInfo.js");
const Social = require("./models/socials.js");
const Contact = require("./models/contactInfo.js");
const User = require("./models/user");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");

const MONGO_URL = "mongodb://127.0.0.1:27017/jobpilot";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

mongoose.connect(MONGO_URL)
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error(err));

// Session setup
app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URL }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy({ usernameField: "orgEmail" }, async (orgEmail, password, done) => {
    try {
        const user = await User.findOne({ orgEmail });
        if (!user) return done(null, false, { message: "Incorrect email" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return done(null, false, { message: "Incorrect password" });

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Middleware to protect routes
function requireLogin(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect("/login");
    next();
}
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}

app.get("/", (req, res) => {
    res.render("./includes/navbar.ejs");
});
app.get("/company", requireLogin, (req, res) => {
    res.render("./ejs/company.ejs");
});
app.get("/founding", requireLogin, (req, res) => {
    res.render("./ejs/founding.ejs");
});
app.get("/socials", requireLogin, (req, res) => {
    res.render("./ejs/socials.ejs");
});
app.get("/contact", requireLogin, (req, res) => {
    res.render("./ejs/contact.ejs");
});
app.get("/login", (req, res) => {
    res.render("./ejs/login.ejs");
});
app.get("/register", (req, res) => {
    res.render("./ejs/register.ejs");
});
app.get("/success", (req, res) => {
    res.render("./ejs/success.ejs");
});
app.get("/dashboard", (req, res) => {
    console.log("User in dashboard:", req.user);
    res.render("dashboard", { user: req.user });
});

app.get("/logout", (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect("/login");
    });
});

// POST routes
app.post("/company", async (req, res) => {
    try {
        const { company_logo, banner_image, company_name, about_us } = req.body;
        const newCompany = new Company({ company_logo, banner_image, company_name, about_us });
        await newCompany.save();
        res.redirect("/founding");
    } catch (err) {
        res.status(500).send("Error saving company info");
    }
});

app.post("/founding", async (req, res) => {
    try {
        const { organization_type, industry_type, team_size, year_established, company_website, company_vision } = req.body;
        const newFounding = new Founding({ organization_type, industry_type, team_size, year_established, company_website, company_vision });
        await newFounding.save();
        res.redirect("/socials");
    } catch (err) {
        res.status(500).send("Error saving founding info");
    }
});

app.post("/socials", async (req, res) => {
    try {
        const { facebook, twitter, instagram, youtube } = req.body;
        const newSocial = new Social({ facebook, twitter, instagram, youtube });
        await newSocial.save();
        res.redirect("/contact");
    } catch (err) {
        res.status(500).send("Error saving socials info");
    }
});

app.post("/contact", async (req, res) => {
    try {
        const { map_location, phone_number, email } = req.body;
        const newContact = new Contact({ map_location, phone_number, email });
        await newContact.save();
        res.redirect("/success");
    } catch (err) {
        res.status(500).send("Error saving contact info");
    }
});

app.post("/register", async (req, res) => {
    try {
        const { fullName, mobile, orgEmail, gender, password } = req.body;
        const user = new User({ fullName, mobile, orgEmail, gender, password });
        await user.save();
        res.redirect("/login");
    } catch (err) {
        res.status(500).send("Error registering user");
    }
});

app.post("/login", (req, res, next) => {
    console.log("Login POST hit:", req.body);
    next();
}, passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
}));
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
