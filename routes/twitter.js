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
  getSignatureWith
  } = require("../oauth/oauth-utils");
const { response } = require('express');
  
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

router.get('/current-user', (req, res) => {
  if (req.session) {
    res.send({ userId : req.session.userId, username : req.session.username })
  }
})

router.get('/twitter/unfollow', (req, res) => {
  
  console.log(req.session);

  const oauthAccessToken = req.session.oauthAccessToken;
  const oauthAccessTokenSecret = req.session.oauthAccessTokenSecret;
  const userId = req.query.user_id
  const target_user_id = req.query.follower_id;
  console.log("Target_UserID = ", target_user_id);
  console.log("UserID = ", userId);
  // var cookie = getcookie(req);

  console.log("Access Token = ", oauthAccessToken);
  const oauthParameters = [
    ['oauth_consumer_key', keys.TWITTER_CONSUMER_KEY],
    ['oauth_nonce', "Tg1DbQltbz9"],    
    ['oauth_signature', "jDBefPKuH%2BPoy2djSvG%2BMtz3uVM%3D"],
    ['oauth_signature_method', "HMAC-SHA1"],
    ['oauth_timestamp', "1617850661"],
    ['oauth_token', oauthAccessToken],
    ['oauth_version', "1.0"]
  ];
  
  let OAUTH_SIGNATURE = getSignatureWith(oauthParameters);
  // var OAUTH_SIGNATURE = `oauth_consumer_key="${keys.TWITTER_CONSUMER_KEY}",oauth_token="${oauthAccessToken}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1617850666",oauth_nonce="Tg1DbQltby7",oauth_version="1.0",oauth_signature="jDBefPKuH%2BPoy2djSvG%2BMtz3uVM%3D"`;
  // var getSignatureWith(OAUTH_SIGNATURE);
  // let config = {
  //   method: 'delete',
  //   url: `https://api.twitter.com/2/users/${userId}/following/${target_user_id}`,
  //   headers: {
      
  //     // 'Authorization': `OAuth oauth_consumer_key="${keys.TWITTER_CONSUMER_KEY}",oauth_token="${oauthAccessToken}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1616969239",oauth_nonce="TS18GdIfGWS",oauth_version="1.0",oauth_signature="khnGkKJDKA0imejSPARIcU%2F77AA%3D"`
  //     "Authorization": `OAuth ${OAUTH_SIGNATURE}`,
  //     'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
  //   }
  // }

  // axios(config)
  //   .then((response) => {
  //     console.log(JSON.stringify(response.data));
  //     alert('User successfully unfollowed');
  // })
  // .catch((error) => {
  //   console.log(error);
  // });
  axios.delete(`https://api.twitter.com/2/users/${userId}/following/${target_user_id}`, {
    headers: {
      "Authorization": OAUTH_SIGNATURE,
    }
  }).then((response) => {
    console.log(`response from delete request`, response);
  });

})


router.get('/twitter/logout', logout);

  function logout(req, res, next) {
    res.clearCookie("twitter_screen_name");
    res.redirect("http://localhost:3000/");
  }


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
  // var followers = await request_followers(req);
  // console.log(`followers `);
  // console.log(followers);
  // return followers;

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
  console.log(`followers from function`, followers);
 
}

function request_followers(req, nextToken) {
  const userId = req.query.user_id;
  var nextTokenQuery = '';
  if (nextToken) {
    nextTokenQuery = "&next_token=" + nextToken;
  }
  return new Promise((resolve, reject) => {
    axios
    .get(`https://api.twitter.com/2/users/${userId}/followers?max_results=1000${nextTokenQuery}`, {
      headers: {
        Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN
      },
    })
      .then((response) => {
        resolve({ followers: response.data.data, nextToken: response.data.meta.next_token });
      })
    .catch((error) => {
      reject(Error("Error requesting followers", error))
    });
  })
  
}
router.get("/twitter/followers", async (req, res) => {
  var followers = await getFollowers(req);
  console.log(`followers from route`, followers);
  res.send(JSON.stringify(followers));
});

// router.get("/twitter/followers", (req, res) => {
//   const userId = req.query.user_id;
//   var paginationQueryParam = "";
//   if (req.query.pagination_token) {
//     paginationQueryParam = "&pagination_token=" + req.query.pagination_token;
//     axios
//     .get(`https://api.twitter.com/2/users/${userId}/followers?max_results=10${paginationQueryParam}`, {
//       headers: {
//         Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN
//       },
//     })
//       .then((response) => {
//       res.send(JSON.stringify(response.data));
//       // jsonexport(
//       //   response.data.data,
//       //   { rowDelimiter: ";" },
//       //   function (err, csv) {
//       //     if (err) return console.error(err);
//       //     fs.writeFile("./data/test.csv", csv, (err) => {
//       //       if (err) {
//       //         console.error(err);
//       //         return;
//       //       }
//       //     });
//       //   }
//       // );

//     })
//     .catch((error) => {
//       console.log(error);
//     });
//   }

//     axios
//         .get(`https://api.twitter.com/2/users/${userId}/followers?max_results=1000`, {
//           headers: {
//             Authorization: "Bearer " + keys.TWITTER_BEARER_TOKEN
//           },
//         })
//       .then((response) => {
//         console.log(`response`, response.data.data[0])
//           res.send(JSON.stringify(response.data));
//           // jsonexport(
//           //   response.data.data,
//           //   { rowDelimiter: ";" },
//           //   function (err, csv) {
//           //     if (err) return console.error(err);
//           //     fs.writeFile("./data/test.csv", csv, (err) => {
//           //       if (err) {
//           //         console.error(err);
//           //         return;`
//           //       }
//           //     });
//           //   }
//           // );

//         })
//         .catch((error) => {
//           console.log(error);
//         });
// });

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