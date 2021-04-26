const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');

const {
  secureDeleteRequest
  } = require("../oauth/oauth-utils");
const { rejects } = require('assert');
  
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
  const source_user_id = req.query.user_id //|| "1623840974";
  const target_user_id = req.query.target_user_id;
  let url = `https://api.twitter.com/2/users/${source_user_id}/following/${target_user_id}`;

  console.log("userId from unfollow endpoint", source_user_id);
  try {
     await secureDeleteRequest(url, oauthAccessToken, oauthAccessTokenSecret);
  } catch (err) {
    error = true;
    message = err;
  }
  
  res.send({
    error: error,
    message: message
  })
});

router.get('/twitter/block', async (req, res) => {
  res.header('Access-Control-Allow-Credentials', true);
  let error = false;
  let message = "User successfully blocked";

  const oauthAccessToken = req.session.oauthAccessToken;
  const oauthAccessTokenSecret = req.session.oauthAccessTokenSecret;
  const source_user_id = req.query.user_id;
  const target_user_id = req.query.target_user_id;
  let url = `https://api.twitter.com/2/users/${source_user_id}/blocking/${target_user_id}`;

  try {
    await secureDeleteRequest(url, oauthAccessToken, oauthAccessTokenSecret);
  } catch (err) {
    error = true;
    message = err;
  }
  
  res.send({
    error: error,
    message: message
  })
})

function getPythonData(userId) {
  // execute child process of python file
  var User_IDs = userId
  return new Promise((resolve, reject) => {
    var child =exec(`python test.py ${User_IDs}`, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }
      if (stderr) {
        reject(console.error(stderr));
      }
      var res = parseInt(stdout)
      resolve({response:res})
    });
    child.stdout.on('data', (data) => {
      var response = parseInt(data)
      console.log('response from stdout.on', response);
    })
    child.on('exit', (code) => {
      console.log('Child process exited with code', code)
    })  
  })
  
  // spawn.stdout.on('data', (data) => {
  //   console.log('Testing stdout...\nData: ', data)
  // })
}

router.get('/twitter/bots', async (req, res) => {
  var userId = req.query.user_id || 1623840974;
  // if no list of users, return error
  if (!userId) {
    res.send("User id needed");
  }
  // else await list of users
  // call function to return object [userId: threat level] getPythonData(users)
  var response = await getPythonData(userId);
  console.log("response from; /twitter/bots: ", response.response)
  // send response of object
  res.send( response);
})

module.exports = router;