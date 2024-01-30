var express = require('express');
var router = express.Router();
var fs = require("fs/promises");
var crypto = require("crypto");
const ALLOWED_USERS = process.env.ALLOWED_USERS || "";
const pubkey_file = "/data/keypair_pub.pem";
const privkey_file = "/data/keypair_priv.pem";

async function readOrGenerateKeypair(mutex, wantPublic) {
  var result;
  await mutex.runExclusive(async () => {
    try {
      // Try to read the requested key file
      result = await fs.readFile(wantPublic ? pubkey_file : privkey_file, 'utf-8');
      return;
    } catch (error) { }

    // If the file doesn't exist, generate a new keypair
    var keypair = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: {
        type: "spki",
        format: "pem"
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem"
      }
    });

    // Write the keypair to disk
    //
    // Caller will need to catch errors here
    await Promise.all([
      fs.writeFile(pubkey_file, keypair.publicKey, 'utf-8'),
      fs.writeFile(privkey_file, keypair.privateKey, 'utf-8')
    ]);
    result = wantPublic ? keypair.publicKey : keypair.privateKey;
  });
  return result;
}

/* Tesla callback from Register flow. */
router.get('/com.tesla.3p.public-key.pem', async function (req, res, next) {

  // Retrieve and return public key
  try {
    var pubkey = await readOrGenerateKeypair(req.app.locals.keyMutex, true);
    return res.
      setHeader("content-type", "application/x-pem-file").
      send(pubkey);
  } catch (error) {
    console.log(error);
  }

  // If failed, return 404
  res.status(404);
  res.send("Not Found");
});

router.get('/com.tesla.3p.private-key.pem', async function (req, res, next) {
  if (req.session.user && ALLOWED_USERS.split(/[ ,;]+/)[0] == req.session.user) {
    // Only the primary user is allowed to download the private key
    try {
      res.
        setHeader("content-type", "application/x-pem-file").
        send(await readOrGenerateKeypair(req.app.locals.keyMutex, false));
      return;
    } catch (error) {
      console.log(error);
    }
  }
  else if (req.session.user) {
    res.status(403);
    res.render("error", {
      message: "Unauthorized",
      error: `${req.session.user} not allowed to download private key.`
    });
    return;
  }
  else {
    res.redirect(tesla.getAuthURL(req.session.id));
  }
});

module.exports = router;
