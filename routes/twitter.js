const express = require("express");
const router = express.Router();
const { exec } = require("child_process");

const { secureDeleteRequest } = require("../oauth/oauth-utils");

router.get("/current-user", (req, res) => {
  if (req.session) {
    res.send({ userId: req.session.userId, username: req.session.username });
  }
});

router.post("/twitter/unfollow", async (req, res) => {
  res.header("Access-Control-Allow-Credentials", true);
  let error = false;
  let message = "User successfully unfollowed";

  const oauthAccessToken = req.session.oauthAccessToken;
  const oauthAccessTokenSecret = req.session.oauthAccessTokenSecret;
  const source_user_id = req.query.user_id; //|| "1623840974";
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
    message: message,
  });
});

router.get("/twitter/block", async (req, res) => {
  res.header("Access-Control-Allow-Credentials", true);
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
    message: message,
  });
});

function getPythonData(userId) {
  // execute child process of python file
  var User_IDs = parseInt(userId);
  return new Promise((resolve, reject) => {
    var child = exec(
      `python is_bot_KNN.py ${User_IDs}`,
      (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          return;
        }
        if (stderr) {
          reject(console.error(stderr), stderr);
        }
        var res = parseInt(stdout[0]);
        resolve({ response: res });
        return;
      }
    );
    child.stdout.on("data", (data) => {
      var response = data;
    });
  });
}

router.get("/twitter/bots", async (req, res) => {
  var userId = req.query.user_id || 1623840974;
  // call function to return object [userId: threat level] getPythonData(users)
  try {
    var response = await getPythonData(userId);
    console.log('try block')
;    // send response of object
    res.send(response);
  } catch (error) {
    res.send("User id needed");
    res.send(error);
    console.log('error block')
  }
});

module.exports = router;
