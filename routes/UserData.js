const express = require('express');
const userData = express.Router();
const axios = require("axios");
const keys = require("../config/keys");
  
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
  var userId;
  if (req.session.userId) {
    userId = req.session.userId
  } else {
    userId = req.query.user_id
  }
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
  
userData.get("/twitter/followers", async (req, res) => {
    var followers = await getFollowers(req);
    res.send(JSON.stringify(followers));
  });
  
userData.get("/twitter/following", (req, res) => {
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


  module.exports = userData;