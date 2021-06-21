//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file thread.js
//@descr compartmentalized ejs objects to be served to views. Improves readability and makes it easier to make changes across the site.
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************

const SHA256 = require("crypto-js/sha256");

class Block {

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
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
    * @auth Joshua Richard
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
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  proofOfWork(difficulty) {
    var begin = Date.now();

    console.log("\n--------Searching for Block---------")
    var count = 0;
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      count = count + 1;
      //console.log(this.hash.substring(0, 4) + "----" + Array(difficulty + 1).join("0"));
      this.nonce++;
      this.hash = this.computeHash();
    }

    var end = Date.now();
    console.log("amount" + count);
    console.log("Added block ");
    console.log("     Index :: " + this.index);
    console.log("     Version :: " + this.version);
    console.log("     Nonce :: " + this.nonce);
    console.log("     Hash :: " + this.hash);
    console.log("Elapsed Time: " + (end - begin) + " msec\n");
  }
}

class Blockchain {
  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  constructor() {
    this.blockchain = [this.startGenesisBlock()];
    this.difficulty = 4;
  }

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  startGenesisBlock() {
    return new Block(0, {transaction_Pool: []}, "0");
  }

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  obtainLatestBlock() {
    return this.blockchain[this.blockchain.length - 1];
  }

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  addNewBlock(newBlock) {
    newBlock.precedingHash = this.obtainLatestBlock().hash;
    //newBlock.hash = newBlock.computeHash();
    newBlock.proofOfWork(this.difficulty);
    this.blockchain.push(newBlock);

    return true;
  }

  checkChainValidity() {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const precedingBlock = this.blockchain[i - 1];

      if (currentBlock.hash !== currentBlock.computeHash()) {
        return false;
      }
      if (currentBlock.precedingHash !== precedingBlock.hash) return false;
    }
    return true;
  }
}

module.exports = Blockchain;
