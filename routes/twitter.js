const express = require('express');
const router = express.Router();

const {
  secureUnfollowRequest
  } = require("../oauth/oauth-utils");
  
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

module.exports = router;