const express = require("express");
const twitterLogin = express.Router();
const oauth = require("oauth");
const {
  getOAuthRequestToken,
  getOAuthAccessTokenWith,
  oauthGetUserById,
} = require("../oauth/oauth-utils");

function twitter(method = "authorize") {
  return async (req, res) => {
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

    req.session.oauthRequestToken = oauthRequestToken;
    req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

    const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
    console.log("redirecting user to ", authorizationUrl);
    res.redirect(authorizationUrl);
  };
}
twitterLogin.get("/twitter/authoriz", twitter());

twitterLogin.get("/auth/oauth/callback", async (req, res, next) => {
  const { oauthRequestToken, oauthRequestTokenSecret } = req.session;
  const { oauth_verifier: oauthVerifier } = req.query;
  const {
    oauthAccessToken,
    oauthAccessTokenSecret,
    results,
  } = await getOAuthAccessTokenWith({
    oauthRequestToken,
    oauthRequestTokenSecret,
    oauthVerifier,
  });
  const { user_id: userId } = results;
  req.session.userId = userId;

  const user = await oauthGetUserById(userId, {
    oauthAccessToken,
    oauthAccessTokenSecret,
  });

  req.session.oauthAccessToken = oauthAccessToken;
  req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
  req.session.twitter_screen_name = user.screen_name;

  console.log("user succesfully logged in with twitter", user.screen_name);
  if (!oauthAccessToken || !oauthAccessTokenSecret) {
    res.redirect("http://localhost:3000/");
    console.log("no oauthAccess token/secret");
  }
  res.redirect(
    "http://localhost:3000/home?user_id=" +
      userId +
      "&username=" +
      user.screen_name
  );
});

module.exports = twitterLogin;
