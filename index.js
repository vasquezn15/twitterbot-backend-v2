const express = require('express');
const app = express();
const port = 5000;
const axios = require('axios');
var urlencode = require('urlencode');
const keys = require("./config/keys");
const oauth = require('oauth')
const { promisify } = require('util')
const cookieParser = require('cookie-parser')
const session = require('express-session');
const { response } = require('express');

const REQUEST_TOKEN_URL = 'https://api.twitter.com/oauth/request_token';
const AUTHORIZE_TOKEN_URL = 'https://api.twitter.com/oauth/authorize';
const ACCESS_TOKEN_URL = 'https://api.twitter.com/oauth/access_token';
const CALLBACK_URL = 'http://localhost:5000/auth/oauth/callback';

main()
  .catch(err => console.error(err.message, err))

async function main() {
  app.use(cookieParser())
  app.use(session({ secret: 'secret3' }))

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

  function twitter(method = 'authorize') {
    return async (req, res) => {
      console.log(`/twitter/${method}`)

      const { oauthRequestToken, oauthRequestTokenSecret, results } = await getOAuthRequestToken()
      console.log(`/twitter/${method} ->`, { oauthRequestToken, oauthRequestTokenSecret, results })

      req.session = req.session || {}
      req.session.oauthRequestToken = oauthRequestToken
      req.session.oauthRequestTokenSecret = oauthRequestTokenSecret

      const authorizationUrl = `https://api.twitter.com/oauth/${method}?oauth_token=${oauthRequestToken}`;
      console.log('redirecting user to ', authorizationUrl);
      res.redirect(authorizationUrl);
    }
  }

  app.use(require('body-parser').urlencoded({ extended: true }));

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.get('/', async (req, res, next) => {
    console.log('/ req.cookies', req.cookies);
    if (req.cookies && req.cookies.twitter_screen_name) {
      console.log('/ authorized', req.cookies.twitter_screen_name);
      return res.render('index', { screen_name: req.cookies.twitter_screen_name });
    }
    else {
      res.render('index', { screen_name: '' })
    }
    return next()
  }
  )

  app.get('/twitter/logout', logout);
  function logout(req, res, next) {
    res.clearCookie('twitter_screen_name');
    req.session.destroy(() => res.redirect('http://localhost:3000/'));
  }

  app.get('/twitter/authoriz', twitter());
  app.get('/auth/oauth/callback', async (req, res) => {
    const { oauthRequestToken, oauthRequestTokenSecret } = req.session;
    const { oauth_verifier: oauthVerifier } = req.query;
    console.log('/twitter/callback', { oauthRequestToken, oauthRequestTokenSecret, oauthVerifier });

    const { oauthAccessToken, oauthAccessTokenSecret, results } = await getOAuthAccessTokenWith({ oauthRequestToken, oauthRequestTokenSecret, oauthVerifier });
    req.session.oauthAccessToken = oauthAccessToken;

    const { user_id: userId } = results;
    req.session.userId = userId;
    const user = await oauthGetUserById(userId, { oauthAccessToken, oauthAccessTokenSecret });

    console.log('user');
    console.log(user);
    console.log(oauthAccessToken);
    console.log(oauthAccessTokenSecret);

    req.session.twitter_screen_name = user.screen_name;
    res.cookie('twitter_screen_name', user.screen_name, { maxAge: 900000, httpOnly: true });

    console.log('user succesfully logged in with twitter', user.screen_name);
    req.session.save(() => res.redirect('http://localhost:3000/?user_id='+ userId +'&username='+user.screen_name));
  }
  )

  app.get('/twitter/followers', (req, res) => {

    const userId = req.query.user_id;
    console.log('UserID = ', userId);
      axios.get(`https://api.twitter.com/2/users/${userId}/followers`, {
        headers: {
          Authorization: 'Bearer ' + keys.TWITTER_BEARER_TOKEN  //the token is a variable which holds the token
        }
      }).then((response) => {
        res.send(JSON.stringify(response.data));
      }).catch((error) => {
          console.log(error);
      })


  })

  app.get('/twitter/following', (req, res) => {

    const userId = req.query.user_id;
    console.log('UserID = ', userId);
      axios.get(`https://api.twitter.com/2/users/${userId}/following`, {
        headers: {
          Authorization: 'Bearer ' + keys.TWITTER_BEARER_TOKEN  //the token is a variable which holds the token
        }
      }).then((response) => {
        res.send(JSON.stringify(response.data));
      }).catch((error) => {
          console.log(error);
      })
  })

  app.listen(port, () => console.log(`Server running on port ${port}`))
}