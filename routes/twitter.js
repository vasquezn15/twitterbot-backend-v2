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

      // req.session = req.session || {};
      req.session.oauthRequestToken = oauthRequestToken;
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
      console.log("redirecting user to ", authorizationUrl);
      res.redirect(authorizationUrl);
    };
}
  
router.get('/route1', (req, res) => {
  req.session.route1 = 'test route'
  console.log(req.session);
  res.send('This is the response')
})

router.get('/route2', (req,res) => {
  console.log(req.session);
  res.send('This is the response2')  })

router.get("/twitter/logout", logout);

  function logout(req, res, next) {
    // res.clearCookie("twitter_screen_name");
    // req.session.destroy(() => res.redirect("http://localhost:3000/"));
  }


  router.get("/twitter/authorize", twitter());
  
  router.get("/auth/oauth/callback", async (req, res, next) => {
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

    res.cookie("twitter_accesstoken", oauthAccessToken, {
      maxAge: 900000,
      httpOnly: true,
    });

    console.log("Access Token: ", oauthAccessToken)
    console.log("Access Token Secret: ", oauthAccessTokenSecret)
    console.log("user succesfully logged in with twitter", user.screen_name);
    
      res.redirect("//localhost:3000/loggedin")
  //   }
  // );
    next();
  });

router.get("/twitter/followers", (req, res) => {
    const userId = req.query.user_id;
    console.log("UserID: " ,userId)
  axios
      .get(`https://api.twitter.com/2/users/${userId}/followers`, {
        headers: {
          Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN, //the token is a variable which holds the token
        },
      })
      .then((response) => {
        res.send(JSON.stringify(response.data));

        jsonexport(
          response.data.data,
          { rowDelimiter: ";" },
          function (err, csv) {
            if (err) return console.error(err);
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

  function getcookie(req) {
    var cookie = req.headers.cookie;
    // user=someone; session=QyhYzXhkTZawIb5qSl3KKyPVN (this is my cookie i get)
    return cookie.split('; ');
}

router.get('/twitter/unfollow', (req, res) => {
  

  const oauthAccessToken = req.session.oauthAccessToken;
  const userId = req.query.user_id
  const target_user_id = req.query.follower_id;
  console.log("Target_UserID = ", target_user_id);
  console.log("UserID = ", userId);
  var cookie = getcookie(req);
  console.log("Access Token = ", cookie);
  
//   axios.delete(`https://api.twitter.com/2/users/${userId}/following/${target_user_id}`, {
//     headers: {
//       'Authorization': `OAuth oauth_consumer_key=${keys.TWITTER_CONSUMER_KEY},oauth_token=${req.session.oauthAccessToken},oauth_signature_method="HMAC-SHA1",oauth_timestamp="1615061519",oauth_nonce="D38X0s5XkMN",oauth_version="1.0",oauth_signature="nvFbuafY8m9vjB16x9PGRDm1vMI%3D"`    }
//   })
//     .then((response) => {
//       console.log(response);
//   })
//   .catch((error) => {
//     console.log(error);
//   });

})

module.exports = router;