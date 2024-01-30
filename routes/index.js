var express = require('express');
var router = express.Router();
var tesla = require('../tesla-tokens.js');
const ALLOWED_USERS = process.env.ALLOWED_USERS || "";
const CLIENT_ID = process.env.CLIENT_ID;

/* GET home page. */
router.get('/', async function (req, res, next) {
  if( !CLIENT_ID ) {
    res.status(200);
    res.render("error", {
      title: "Container is running",
      message: "Up and running",
      error: "Need the Tesla client ID to do anything useful, but make sure TLS works here first."
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
          var newToken = await tesla.doRefresh(userToken.refresh_token);
          userToken = newToken;
          await db.put(req.session.user, userToken);
        }
        res.render('index', {
          CLIENT_ID: CLIENT_ID,
          title: 'Tesla Token Proxy',
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
