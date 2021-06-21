//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file Wallet.js
//@descr class instance of a wallet implementation on the Oodle network.
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

class Wallet {
  constructor(publicKey, privateKey){
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.walletAmount = function(UTXO){
      this.UTXO = UTXO;
    };
  }

  searchWallet(key, index){

  }
}
//var wallet = new Wallet("asdfasfasdf", "sdafsdafasdf");
//wallet.walletAmount(["asdfas", ...]);
module.exports = Wallet;
