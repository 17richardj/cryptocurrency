//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file thread.js
//@descr Class implementation of necessary functions and constructor for an instance of a user on the Oodle network.
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************


var crypto = require('crypto');
var secp256k1 = require('secp256k1')
const secureRandom = require('secure-random');
var ec = require('elliptic').ec;
const sha256 = require('js-sha256');
const ripemd160 = require('ripemd160');
const bs58 = require('bs58')

// Create and initialize EC context
// (better do it once and reuse it)
var ecdsa = new ec('secp256k1');

class Clients {

  //No param constructor
  constructor(){

    /**
    *@privatekey : generate a private key in hexidecimal format
    *@publickey : generate users public key in raw byte format
    *@pubKeyBuffer : convert public key to raw byte format
    *@address : generate public key address in hexidecimal format
    **/
    const privateKey = Clients.nprivateKey();
    const publicKey = Clients.npublicKey(privateKey);
    var pubKeyBuffer  = new Buffer.from(publicKey, 'uint8');
    const address = Clients.generatePublicAddress(pubKeyBuffer.toString('hex'));

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.address = address;
  }

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

static nprivateKey(){
  const max = Buffer.from("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140", 'hex');
  let isInvalid = true;
  let privateKey;
  while (isInvalid) {
    privateKey = secureRandom.randomBuffer(32);
    if (Buffer.compare(max, privateKey) === 1) {
      isInvalid = false;
    }
  }
  console.log('> Private key: ', privateKey.toString('hex'));
  return privateKey;//.toString('hex');
}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc generate public key using elliptic curve cryptogrophy
  * @param privKey : private key in raw byte format
  * @return pubKey - raw bytes
*/

static npublicKey(privKey){
  //gen public key using elliptic library
  var pubKey = secp256k1.publicKeyCreate(privKey);

  var key = Buffer.from(pubKey).toString('hex')
  console.log('> Public key created: ', key);

  return pubKey;
}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc generate public key address from public key hash
  * @param : publicKeyHash - hash of the public key to be hashed
  * @return address - in hexidecimal format
*/

static generatePublicAddress(publicKeyHash) {
  // step 1 - add prefix "00" in hex
  const step1 = Buffer.from("00" + publicKeyHash, 'hex');
  // step 2 - create SHA256 hash of step 1
  const step2 = sha256(step1);
  // step 3 - create SHA256 hash of step 2
  const step3 = sha256(Buffer.from(step2, 'hex'));
  // step 4 - find the 1st byte of step 3 - save as "checksum"
  const checksum = step3.substring(0, 8);
  // step 5 - add step 1 + checksum
  const step4 = step1.toString('hex') + checksum;
  // return base 58 encoding of step 5
  const address = bs58.encode(Buffer.from(step4, 'hex'));

  return address;
}
mind(hash){
  return Clients.generatePublicAddress(hash);
}
}

//var yo = new Clients();

//console.log(yo.mind('033b18e24fb031dae396297516a54f3e46cc9902adfd1b8edea0d6a01dab0e027d'));
//let user = new Clients('dskfajsdf', 'asdfjaskd', 'fajsdfljasd');
//var priv = user.nprivateKey();
//var pub = user.npublicKey(priv);
//console.log("new address: "+user.generatePublicAddress(pub.toString('hex')));

//Export module as CLients
module.exports = Clients;
