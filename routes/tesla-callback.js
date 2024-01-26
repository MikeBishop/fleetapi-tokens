var express = require('express');
var router = express.Router();

/* Tesla callback from OAuth flow. */
router.get('/', async function(req, res, next) {
  if( req.session.id == req.query.state ) {
    // State matches, continue
    if( req.query.code ) {
      // Code is present, exchange for token
      var token = await tesla.doTokenExchange(req.query.code);
      var username = await tesla.getUsername(token.access_token);

      // Store token in database
      var db = res.app.locals.db;
      await db.put(username, token);
      res.session.user = username;

      res.redirect('/');
    }
    else {
      // Code is not present, redirect to home page and try again
      res.redirect('/');
    }
  }
  else{
    // State does not match, redirect to home page
    res.status(401).send("State does not match");
  }
});

module.exports = router;
