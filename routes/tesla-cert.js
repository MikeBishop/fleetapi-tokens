var express = require('express');
var router = express.Router();
var fs = require("fs/promises");
var crypto = require("crypto");

/* Tesla callback from OAuth flow. */
router.get('/com.tesla.3p.public-key.pem', async function(req, res, next) {
  // - If cert doesn't exist, generate EC keypair using the secp256r1 curve
  //   (prime256v1) and write to disk
  const pubkey_file = "/data/keypair_pub.pem";
  const privkey_file = "/data/keypair_priv.pem";

  try {
    // Try to read the public key file
    const pubkey = await fs.readFile(pubkey_file);
    res.send(pubkey);
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
  var pubkey_wrapped = `-----BEGIN PUBLIC KEY-----\n${keypair.publicKey}\n-----END PUBLIC KEY-----\n`;
  try {
    await fs.writeFile(pubkey_file, pubkey_wrapped);
    await fs.writeFile(privkey_file, `-----BEGIN EC PRIVATE KEY-----\n${keypair.privateKey}\n-----END EC PRIVATE KEY-----\n`);
  } catch (error) {
    console.log(error);
  }
  
  // - Return public key in PEM format
  res.send(pubkey_wrapped);
});

module.exports = router;
