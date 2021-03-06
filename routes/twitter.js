const express = require('express');
const router = express.Router();
const axios = require("axios");
const keys = require("../config/keys");
const jsonexport = require("jsonexport");
const fs = require("fs");

const {
    getOAuthRequestToken,
    getOAuthAccessTokenWith,
    oauthGetUserById,
  } = require("../oauth/oauth-utils");

function twitter(method = "authorize") {
    return async (req, res) => {
      console.log(`/twitter/${method}`);

      const {
        oauthRequestToken,
        oauthRequestTokenSecret,
        results,
      } = await getOAuthRequestToken();
      console.log(`/twitter/${method} ->`, {
        oauthRequestToken,
        oauthRequestTokenSecret,
        results,
      });

      req.session = req.session || {};
      req.session.oauthRequestToken = oauthRequestToken;
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
      console.log("redirecting user to ", authorizationUrl);
      res.redirect(authorizationUrl);
    };
  }

router.get("/twitter/logout", logout);
  function logout(req, res, next) {
    res.clearCookie("twitter_screen_name");
    req.session.destroy(() => res.redirect("http://localhost:3000/"));
  }

  router.get("/twitter/authoriz", twitter());
  
  router.get("/auth/oauth/callback", async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session;
    const { oauth_verifier: oauthVerifier } = req.query;
    console.log("/twitter/callback", {
      oauthRequestToken,
      oauthRequestTokenSecret,
      oauthVerifier,
    });

    const {
      oauthAccessToken,
      oauthAccessTokenSecret,
      results,
    } = await getOAuthAccessTokenWith({
      oauthRequestToken,
      oauthRequestTokenSecret,
      oauthVerifier,
    });
    req.session.oauthAccessToken = oauthAccessToken;

    const { user_id: userId } = results;
    req.session.userId = userId;
    const user = await oauthGetUserById(userId, {
      oauthAccessToken,
      oauthAccessTokenSecret,
    });

    req.session.twitter_screen_name = user.screen_name;
    res.cookie("twitter_screen_name", user.screen_name, {
      maxAge: 900000,
      httpOnly: true,
    });

    console.log("user succesfully logged in with twitter", user.screen_name);
    req.session.save(() =>
      res.redirect(
        "http://localhost:3000/?user_id=" +
          userId +
          "&username=" +
          user.screen_name
      )
    );
  });

  router.get("/twitter/followers", (req, res) => {
    const userId = req.query.user_id || "1050522049947545600";
    axios
      .get(`https://api.twitter.com/2/users/${userId}/followers`, {
        headers: {
          Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN, //the token is a variable which holds the token
        },
      })
      .then((response) => {
        res.send(response.data);
        jsonexport(
          response.data.data,
          { rowDelimiter: ";" },
          function (err, csv) {
            if (err) return console.error(err);
            console.log(csv);
            fs.writeFile("./data/test.csv", csv, (err) => {
              if (err) {
                console.error(err);
                return;
              }
            });
          }
        );
      })
      .catch((error) => {
        console.log(error);
      });
  });

  router.get("/twitter/following", (req, res) => {
    const userId = req.query.user_id;
    console.log("UserID = ", userId);
    axios
      .get(`https://api.twitter.com/2/users/${userId}/following`, {
        headers: {
          Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN, //the token is a variable which holds the token
        },
      })
      .then((response) => {
        res.send(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });
  });

module.exports = router;