//****************************************************************************************************************************
//@version - v1.0.0
//@file interpreter.js
//@descr stack based compiler and interpreter meant to read and process script commands embedded in the Oodle coin network
//****************************************************************************************************************************

const SHA256 = require("crypto-js/sha256");
require('dotenv').config();

class Block {

  /**
    * @version - v1.0.0
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  constructor(index, data, precedingHash = " ") {
    this.version = process.env.TOKEN_VERSION;
    this.index = index;
    this.timestamp = Date.now();
    this.data = data;
    this.precedingHash = precedingHash;
    this.hash = this.computeHash();
    this.nonce = 0;
    this.coin = {
      amount: 10,
      owner: null,
      date_created: Date.now()
    };
  }

  /**
    * @version - v1.0.0
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  computeHash() {
    return SHA256(
      this.index +
        this.precedingHash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonce
    ).toString();
  }

  /**
    * @version - v1.0.0
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  proofOfWork(difficulty) {
    var begin = Date.now();
    var count = 0;

    console.log("\n--------Searching for Block---------")

    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      count++;
      //console.log(this.hash.substring(0, 4) + "----" + Array(difficulty + 1).join("0"));
      this.nonce++;
      this.hash = this.computeHash();
    }

    var end = Date.now();

    var elapsed = end - begin;

    console.log("Added block ");
    console.log("     Index :: " + this.index);
    console.log("     Difficulty :: " + "("+difficulty+" bits)");
    console.log("     Version :: " + this.version);
    console.log("     Nonce :: " + this.nonce);
    console.log("     Hash :: " + this.hash);
    console.log("Elapsed Time :: " + elapsed + " msec");
    console.log("Total hashes indexed :: " + count);
    console.log("Hashing Power :: " + (count / (elapsed/1000) ).toFixed(2) + " hashes/sec");
  }
}
module.exports = Block;
