const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')
const secureRandom = require('secure-random');
const sha256 = require('js-sha256');
var crypto = require('crypto');

require("dotenv").config();

class Transaction{

  /**
    * @version - v1.0.0
    * @auth Joshua Richard
    * @desc generate private key using elliptic curve cryptogrophy
    * @param : null
    * @return bytes - raw byte
  */

  constructor(lock_time, index){
    this.version = process.env.TOKEN_VERSION;
    this.index = index;
    this.input_Counter = 0;
    this.input = function(index, script){
      this.input = {
        txid : Transaction.getTxid(),
        index : index,
        unlock_script_size : [],
        script : script,
        sequence_number : 0xffffffff
      }
    };
    this.output_Counter = 0;
    this.output = function(amount, script){
      this.output = {
        amount : amount,
        lock_script_size : 0,
        script : script,
        address : 0
      }
    };
    this.lock_time = lock_time;
  }
// convert an integer into a buffer of a single byte

static numberToInt8(n) {

    return new Buffer([n]);

};


// convert an integer into a buffer of 4 bytes using

// Little-Endian convention

static numberToInt32LE(n) {

    var buffer = new Buffer(4);

    buffer.writeUInt32LE(n,0);

    return buffer;

};


serializeTransaction(transaction) {

    transaction = new Buffer.from(transaction);

    return transaction;

};

static getTxid() {
  var bytes = secureRandom(10); //return an Array of 10 bytes

  var txid = sha256 (sha256 (bytes));

  return txid;

};

sha256(buffer) {

    var f = crypto.createHash("SHA256");

    var h = f.update(buffer);

    return h.digest();

};


ripemd160(buffer) {

    var f = crypto.createHash("RIPEMD160");

    var h = f.update(buffer);

    return h.digest();

};


}
//var new_Transaction = new Transaction(0, 0);

//new_Transaction.input(0, 0, 0);
//new_Transaction.output(0, ["sadfa"]);
//console.log(new_Transaction);

module.exports = Transaction;
