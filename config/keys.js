require('dotenv').config();

const TWITTER_TOKENS = {
    TWITTER_CONSUMER_KEY: process.env.apikey,
    TWITTER_CONSUMER_SECRET: process.env.apikeysecret,
    TWITTER_ACCESS_TOKEN:   process.env.accesstoken,
    TWITTER_TOKEN_SECRET: process.env.accesstokensecret,
    TWITTER_BEARER_TOKEN: process.env.bearertoken
  };
  
  
  const SESSION = {
    COOKIE_KEY: "thisappisawesome"
  };
  
  const KEYS = {
    ...TWITTER_TOKENS,
    ...SESSION
  };
  
  module.exports = KEYS;