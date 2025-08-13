
  require("dotenv").config(); // Load environment variables from .env file


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
const flash = require("connect-flash");
// const upload = require("./multerConfig");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// Multer storage setup (store on Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "company_uploads",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});
const upload = multer({ storage });

const MONGO_URL = "mongodb://127.0.0.1:27017/jobpilot";

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// DB connection
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

app.use(flash());
app.use((req, res, next) => {
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.user = req.user;
    next();
});

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

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

// Routes
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
app.get("/dashboard", requireLogin, (req, res) => {
    res.render("dashboard", { user: req.user });
});
app.get("/logout", (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        req.flash("success", "Logged out successfully");
        res.redirect("/login");
    });
});

// POST routes
app.post(
  "/company",
  upload.fields([{ name: "company_logo", maxCount: 1 }, { name: "banner_image", maxCount: 1 }]),
  async (req, res) => {
    try {
      // Extract uploaded URLs
      const companyLogoUrl = req.files.company_logo[0].path;
      const bannerImageUrl = req.files.banner_image[0].path;

      const { company_name, about_us } = req.body;

      const newCompany = new Company({
        company_logo: companyLogoUrl,
        banner_image: bannerImageUrl,
        company_name,
        about_us
      });

      await newCompany.save();

      console.log("New company saved:", JSON.stringify(newCompany, null, 2));

      res.redirect("/founding");
    } catch (err) {
      console.error("Error saving company:", err);
      res.status(500).send({ error: err.message, details: err });
    }
  }
);

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
        req.flash("success", "Registration successful! Please log in.");
        res.redirect("/login");
    } catch (err) {
        req.flash("error", "Error registering user");
        res.redirect("/register");
    }
});

// Updated login route with error handling
app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash("error", info.message);
            return res.redirect("/login");
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            req.flash("success", "Logged in successfully!");
            return res.redirect("/dashboard");
        });
    })(req, res, next);
});

// Server
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
