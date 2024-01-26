var express = require('express');
var router = express.Router();
var fs = require("fs/promises");
var crypto = require("crypto");


/* Tesla callback from OAuth flow. */
router.get('/com.tesla.3p.public-key.pem', async function(req, res, next) {
  await req.app.locals.keyMutex.runExclusive(async () => {
    // - If cert doesn't exist, generate EC keypair using the secp256r1 curve
    //   (prime256v1) and write to disk
    const pubkey_file = "/data/keypair_pub.pem";
    const privkey_file = "/data/keypair_priv.pem";

    try {
      // Try to read the public key file
      const pubkey = await fs.readFile(pubkey_file);
      res.send(pubkey);
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
    try {
      await fs.writeFile(pubkey_file, keypair.publicKey);
      await fs.writeFile(privkey_file, keypair.privateKey);

      // If successfully saved, return public key in PEM format
      res.send(keypair.publicKey);
      return;
    } catch (error) {
      console.log(error);
    }

    // If failed, return 404
    res.status(404);
    res.send("Not Found");
  });
});

module.exports = router;
