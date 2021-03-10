const express = require("express");
const app = express();
const port = 5000;
const routes = require('./routes/twitter');
const cookieParser = require("cookie-parser");
const session = require("express-session");
var FileStore = require('session-file-store')(session);
var cookieSession = require('cookie-session')


app.use(cookieSession({
  name: 'session',
  keys: ['secretkey'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

// app.use(cookieParser());

// app.use(session({
//     store: new FileStore,
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true
//   }));

  app.use('', routes)

  // Middlewere to save the sessions for each redirect
  app.use((req, res, next) => {
    const oldRedirect = res.redirect;
    res.redirect = function (...args) {
      if (req.session) {
        // redirecting after saving...
        req.session.save(() => Reflect.apply(oldRedirect, this, args))
      } else {
        Reflect.apply(oldRedirect, this, args);
      }
    }
  })

  app.use(require("body-parser").urlencoded({ extended: true }));

  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");

  app.get("/", async (req, res, next) => {
    console.log("req.cookies", req.cookies);
    if (req.cookies && req.cookies.twitter_screen_name) {
      console.log("/ authorized", req.cookies.twitter_screen_name);
      return res.render("index", {
        screen_name: req.cookies.twitter_screen_name,
      });
    } else {
      res.render("index", { screen_name: "" });
    }
    return next();
  });

  app.listen(port, () => console.log(`Server running on port ${port}`));