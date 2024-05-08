var express = require('express');
var router = express.Router();
var tesla = require('../tesla-tokens.js');
const ALLOWED_USERS = process.env.ALLOWED_USERS || "";
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

/* GET home page. */
router.get('/', async function (req, res, next) {
  if (!ALLOWED_USERS) {
    return res.
      status(500).
      render("error", {
        title: "Configuration error",
        message: "Configuration error",
        error: "No users allowed to use this service; set ALLOWED_USERS."
      });
  }

  if( !CLIENT_ID || !CLIENT_SECRET ) {
    res.status(200);
    res.render("error", {
      title: "Container is running",
      message: "Up and running",
      error: "Need the Tesla client ID and secret to do anything useful, but make sure TLS works here first."
    });
    return;
  }

  if (!req.app.locals.registered) {
    let error = false;
    await req.app.locals.registerMutex.runExclusive(async () => {
      if (!req.app.locals.registered) {
        try {
          await tesla.doRegister();
          req.app.locals.registered = true;
        }
        catch (e) {
          res.status(503);
          res.render("error", {
            message: "Failed to perform partner registration",
            error: e
          });
          error = true;
        }
      }
    });
    if (error) {
      return;
    }
  }

  // If unauthenticated, redirect to login
  if (!req.session.user) {
    res.redirect(tesla.getAuthURL(req.session.id));
  }
  else {
    // If user allowed:
    //   - Refresh token if needed
    //   - Show token

    const allowed_users = ALLOWED_USERS.split(/[ ,;]+/);
    if (allowed_users.includes(req.session.user)) {
      var db = res.app.locals.db;
      var userToken = await db.get(req.session.user);

      if (userToken) {
        // Check if token is expired / near expiration
        if (userToken.expiration < (Date.now() / 1000) + 3600) {
          // Renew token
          try {
            var newToken = await tesla.doRefresh(userToken.refresh_token);
            userToken = newToken;
            await db.put(req.session.user, userToken);
          }
          catch (e) {
            if( e.message.startsWith("401") ) {
              // Token is invalid, redirect to login
              return res.redirect(tesla.getAuthURL(req.session.id));
            }
            else {
              res.status(503);
              return res.render("error", {
                message: "Failed to refresh token",
                error: e.message
              });
            }
          }
        }
        res.render('index', {
          CLIENT_ID: CLIENT_ID,
          title: 'Fleet API Tokens',
          user: req.session.user,
          access_token: userToken.access_token,
          refresh_token: userToken.refresh_token,
          expiration: userToken.expiration,
          showPrivateKey: req.session.user == allowed_users[0]
        });
      }
      else {
        // User has no token stored, redirect to login
        res.redirect(tesla.getAuthURL(req.session.id));
      }
    }
    else {
      // User not allowed, but was previously?
      var username = req.session.user;
      req.session.destroy();
      res.status(403).render("error", {
        message: "Unauthorized",
        error: `${username} not in ALLOWED_USERS`
      });

    }
  }
});

module.exports = router;
