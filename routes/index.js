var express = require('express');
var router = express.Router();
var tesla = require('../tesla-tokens.js');
const ADMIN_USER = process.env.ADMIN_USER;

/* GET home page. */
router.get('/', async function(req, res, next) {
  // If unauthenticated, redirect to login
  if (!req.session.user) {
    res.redirect(tesla.getAuthURL(req.session.id));
  }
  else {
    // TBD page: 
    // 
    // - If token expired, renew token
    // - Show user token
    // - If User is admin, show user list

    var db = res.app.locals.db;
    var userToken = await db.get(req.session.user);

    if( userToken ) {
      // Check if token is expired / near expiration
      if( userToken.expiration < (Date.now() / 1000) + 3600 ) {
        // Renew token
        var newToken = await tesla.doTokenRefresh(userToken.refresh_token);
        userToken = newToken;
        await db.put(req.session.user, userToken);
      }
      res.render('index', { title: 'Tesla Token Proxy', user: req.session.user });
    }
    else {
      // User has no token stored, redirect to login
      res.redirect(tesla.getAuthURL(req.session.id));
    }
  }
});

module.exports = router;
