var express = require('express');
var router = express.Router();
var tesla = require("../tesla-tokens");
const ALLOWED_USERS = process.env.ALLOWED_USERS || "";

/* Tesla callback from OAuth flow. */
router.get('/', async function(req, res, next) {
  var error = null;
  if( req.session.id == req.query.state && req.query.code ) {
      // Code is present, exchange for token
      try {
        var token = await tesla.doTokenExchange(req.query.code);
        var username = await tesla.getUsername(token.access_token);

        if( ALLOWED_USERS.split(/[ ,;]+/).includes(username)) {
          // Store token in database
          var db = res.app.locals.db;
          await db.put(username, token);
          req.session.user = username;
          await req.session.saveAsync();

          res.redirect('/');
          return;
        }
        else {
          error = `${username} not in ALLOWED_USERS`;
        }
      }
      catch(e) {
        error = e;
      }
  }

  // Unable to use result
  res.status(403).render("error", {
    message: "Unauthorized",
    error: JSON.stringify(error)
  });
});

module.exports = router;
