const express = require("express");
const app = express();
const port = 5000;
const routes = require("./routes/twitter");
const twitterLogin = require("./routes/TwitterLogin");
const userData = require("./routes/UserData");
const cookieParser = require("cookie-parser");
const session = require("express-session");

main().catch((err) => console.error(err.message, err));

async function main() {
  app.use(cookieParser());
  app.use(
    session({ secret: "ssshhhhh", saveUninitialized: true, resave: true })
  );

  app.use(require("body-parser").urlencoded({ extended: true }));
  app.use("", routes);
  app.use("", twitterLogin);
  app.use("", userData);

  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");

  app.get("/", async (req, res, next) => {
    console.log("/ req.cookies", req.cookies);
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
}
