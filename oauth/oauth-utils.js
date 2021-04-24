const { response } = require('express');
const oauth = require('oauth');
const { resolve } = require('path');
const { promisify } = require('util')
const keys = require("../config/keys");

const REQUEST_TOKEN_URL = 'https://api.twitter.com/oauth/request_token';
const AUTHORIZE_TOKEN_URL = 'https://api.twitter.com/oauth/authorize';
const ACCESS_TOKEN_URL = 'https://api.twitter.com/oauth/access_token';
const CALLBACK_URL = 'http://localhost:5000/auth/oauth/callback';

const oauthConsumer = new oauth.OAuth(
    REQUEST_TOKEN_URL, ACCESS_TOKEN_URL,
    keys.TWITTER_CONSUMER_KEY,
    keys.TWITTER_CONSUMER_SECRET,
    '1.0A', CALLBACK_URL, 'HMAC-SHA1'
  )

  async function oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret } = {}) {
    return promisify(oauthConsumer.get.bind(oauthConsumer))(`https://api.twitter.com/1.1/users/show.json?user_id=${userId}`, oauthAccessToken, oauthAccessTokenSecret)
      .then(body => JSON.parse(body))
  }

  async function getOAuthRequestToken() {
    return new Promise((resolve, reject) => {
      oauthConsumer.getOAuthRequestToken(function (error, oauthRequestToken, oauthRequestTokenSecret, results) {
        return error
          ? reject(new Error('Error getting OAuth request token'))
          : resolve({ oauthRequestToken, oauthRequestTokenSecret, results })
      })
    })
  }

  async function getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier } = {}) {
    return new Promise((resolve, reject) => {
      oauthConsumer.getOAuthAccessToken(oauthRequestToken, oauthRequestTokenSecret, oauthVerifier, function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
        return error
          ? reject(new Error('Error getting OAuth access token'))
          : resolve({ oauthAccessToken, oauthAccessTokenSecret, results })
      })
    })
}
function _encodeData(toEncode){
  let result = encodeURIComponent(toEncode);
  
    return result.replace(/\!/g, "%21")
                  .replace(/\'/g, "%27")
                  .replace(/\(/g, "%28")
                  .replace(/\)/g, "%29")
                  .replace(/\*/g, "%2A");
}
 
function getSignatureWith(orderedParameters) {
  var authHeader="OAuth ";
  for( var i= 0 ; i < orderedParameters.length; i++) {
     
      authHeader+= "" + _encodeData(orderedParameters[i][0])+"=\""+ _encodeData(orderedParameters[i][1])+"\""+ ",";
  }
  authHeader = authHeader.substring(0, authHeader.length - 1);
  console.log('authHeader from getSignatureWith function Oauth utils', authHeader);
  return authHeader;
}

function secureDeleteRequest(url, oauth_token, oauth_token_secret) {
  return new Promise((resolve, reject) => {
    oauthConsumer.delete(url, oauth_token, oauth_token_secret, (err, data, response) => {
      console.log("secureUnfollowRequest args", arguments);
      if (err) {
        reject("An error happened trying to unfollow user");
        return;
      }
      resolve(true);
    });
  })
}
  
module.exports = {
    oauthGetUserById,
    getOAuthAccessTokenWith,
  getOAuthRequestToken,
  getSignatureWith,
  secureDeleteRequest
  }