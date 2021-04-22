const express = require('express');
const router = express.Router();
const axios = require("axios");
const keys = require("../config/keys");
const jsonexport = require("jsonexport");
const fs = require("fs");
const oauth = require('oauth');
var btoa = require('btoa');

const {
    getOAuthRequestToken,
    getOAuthAccessTokenWith,
  oauthGetUserById,
  getSignatureWith,
  secureUnfollowRequest
  } = require("../oauth/oauth-utils");
const { response } = require('express');
  
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

      // req.session = req.session || {};
      req.session.oauthRequestToken = oauthRequestToken;
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret;

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
      console.log("redirecting user to ", authorizationUrl);
      res.redirect(authorizationUrl);
    };
}

router.get('/current-user', (req, res) => {
  if (req.session) {
    res.send({ userId : req.session.userId, username : req.session.username })
  }
})

router.post('/twitter/unfollow', async (req, res) => {
  res.header('Access-Control-Allow-Credentials', true);
  let error = false;
  let message = "User successfully unfollowed";

  const oauthAccessToken = req.session.oauthAccessToken;
  const oauthAccessTokenSecret = req.session.oauthAccessTokenSecret;
  const userId = req.query.user_id || "1623840974";
  const target_user_id = req.query.follower_id;
  let url = `https://api.twitter.com/2/users/1623840974/following/${target_user_id}`;

  try {
     await secureUnfollowRequest(url, oauthAccessToken, oauthAccessTokenSecret);
  } catch (err) {
    error = true;
    message = err;
  }
  
  res.send({
    error: error,
    message: message
  })
});

router.get("/twitter/authoriz", twitter());
  
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
  req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;

  const { user_id: userId } = results;
  req.session.userId = userId;

  const user = await oauthGetUserById(userId, {
    oauthAccessToken,
    oauthAccessTokenSecret,
  });

  req.session.twitter_screen_name = user.screen_name;

  console.log("user succesfully logged in with twitter", user.screen_name);
    
  // req.session.save(function(err) {
  //   if(err) {
  //     res.end('session save error: ' + err)
  //     return
  //   }
  res.redirect(
    "http://localhost:3000/home?user_id=" +
    userId +
    "&username=" +
    user.screen_name
  )
  // })
});

async function getFollowers(req) {

  var nextToken = '';
  var followers = [];
  try {
    do {
      let currentFollowersResponse = await request_followers(req, nextToken);
      let currentFollowers = currentFollowersResponse["followers"];
      nextToken = currentFollowersResponse["nextToken"];
      
      if (currentFollowers && currentFollowers.length > 0) {
        followers = followers.concat(currentFollowers);
      }
      return followers;

    } while (nextToken);
  }
  catch (error) {
    console.log(`error`, error);
    throw new Error("Error getting followers")
  } 
}

function request_followers(req, nextToken) {
  const userId = req.query.user_id;
  var nextTokenQuery = '';
  if (nextToken) {
    nextTokenQuery = "&next_token=" + nextToken;
  }
  return new Promise((resolve, reject) => {
    axios
    .get(`https://api.twitter.com/2/users/${userId}/followers?max_results=1000${nextTokenQuery}&user.fields=profile_image_url`, {
      headers: {
        Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN
      },
    })
      .then((response) => {
        resolve({ followers: response.data.data, nextToken: response.data.meta.next_token});
      })
    .catch((error) => {
      reject(Error("Error requesting followers", error))
    });
  })
  
}
router.get("/twitter/followers", async (req, res) => {
  var followers = await getFollowers(req);
  res.send(JSON.stringify(followers));
});

router.get("/twitter/following", (req, res) => {
  const userId = req.query.user_id;
  axios
    .get(`https://api.twitter.com/2/users/${userId}/following?max_results=1000&user.fields=profile_image_url`, {
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

router.get('/twitter/tweets', (req, res) => {
  const userId = req.query.user_id;
  axios.get(`https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=created_at,author_id,conversation_id,public_metrics,context_annotations&place.fields=full_name`, {
    headers: {
      Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN, //the token is a variable which holds the token
    },
  })
    .then((response) => {
      console.log('Response: ', response.data);
      jsonexport(
        response.data.data,
        { rowDelimiter: ";" },
        function (err, csv) {
          if (err) return console.error(err);
          console.log(csv);
          fs.writeFile("./data/tweets.csv", csv, (err) => {
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

module.exports = router;