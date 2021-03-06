const oauth = require('oauth')
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
  
module.exports = {
    oauthGetUserById,
    getOAuthAccessTokenWith,
    getOAuthRequestToken
  }