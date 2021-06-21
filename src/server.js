//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file server.js
//@descr implementation of a single node on the oodle network
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************

const chalk = require('chalk');
var net = require('net');
var stream = require('stream');
const secureRandom = require('secure-random');
var EC = require('elliptic').ec;
const sha256 = require('js-sha256');
const ripemd160 = require('ripemd160');
const bs58 = require('bs58')
var crypto = require('crypto');
var secp256k1 = require('secp256k1');
var ecdsa = new EC('secp256k1');
const path = require('path')

//for worker threads when mining
const { Worker, isMainThread, parentPort } = require("worker_threads");

//gather.env variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

// Create SocketIO instance, connect
var client = require("socket.io-client");
var socket = client.connect("http://localhost:3000");
socket.emit("test", "foo");

    // Add a connect listener
    socket.on('connect',function() {
      console.log('Client has connected to the server!');
    });
    // Add a connect listener
    socket.on('message',function(data) {
      console.log('Received a message from the server!',data);
    });
    // Add a disconnect listener
    socket.on('disconnect',function() {
      console.log('The client has disconnected!');
    });

    // Sends a message to the server via sockets
    function sendMessageToServer(message) {
      socket.send(message);
    };

// Create and initialize EC context
// (better do it once and reuse it)
var ecdsa = new EC('secp256k1');

//
//Require requisite models and modules
//
let blChain= require('../models/Blockchain')
let blck = require('../models/Block')
let user = require('../models/User')
let transaction = require('../models/Transaction')
let isValidated = require('../virtual_machine/interpreter')
//let wallet = require('./models/Wallet')
//let transaction = require('./models/Transaction')

//let interpreter = require('./virtual_machine/interpreter')

//begin instance of new chain
let chain = new blChain;

var blockChain = chain;

//POOL_REQ - the amount of transactions in a pool before mining process begins
//DNS_PORT - the port of a DNS server if implemented
const POOL_REQ = process.env.POOL_REQ;
const DNS_PORT = process.env.DNS_PORT;

//POOL of all current transactions before block processing, stored in ram
var transaction_Pool = [POOL_REQ];
//POOL of all known nodes at any given time
var known_Nodes = [];

//Count of transactions in transaction pool -
//Index of
//flag - if server data should be deleted
//isMining - lets server know if there are any threads currently mining and acts accordingly
var count = 0;
var index = 1;
var flag = false;
var isMining = false;

//*************************************************************************************************************************************
// BEGIN CLIENT SIDE TCP CONNECTION TO DNS
//*************************************************************************************************************************************

//begin server instance
var server = net.createServer();

//client connection for tcp server
var client = net.connect(1234, 'localhost', function() {
  console.log(chalk.green("NODE SUCCESSFULLY CONNECTED TO DNS"));
});
client.on('error', function(ex) {
  //console.log(chalk.red("NODE FAILED TO CONNECT TO DNS"));
  //console.log(ex);
});

//when data is received from client
client.on('data', (data) => {
  console.log(data.toString());
  //end client
  client.end();
});

//when client is closed
client.on('close', function() {
       console.log('connection got closed, will try to reconnect');
       //close client
         client.end();
       });
//end TCP connection
client.on('end' , function(){
      console.log('Requested an end to the TCP connection');
       });

//emitted when server closes ...not emitted until all connections closes.
server.on('close',function(){
  console.log('Server closed !');
});

//*************************************************************************************************************************************
// END CLIENT SIDE TCP CONNECTION TO DNS
//*************************************************************************************************************************************

// emitted when new client connects
server.on('connection',function(socket){
  //console.log(cope(7));
//this property shows the number of characters currently buffered to be written. (Number of characters is approximately equal to the number of bytes to be written, but the buffer may contain strings, and the strings are lazily encoded, so the exact number of bytes is not known.)
//Users who experience large or growing bufferSize should attempt to "throttle" the data flows in their program with pause() and resume().

//size of the socket buffers
  console.log('Buffer size : ' + socket.bufferSize);

  console.log('---------server details -----------------');

  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log('Server is listening at port ' + port);
  console.log('Server ip :' + ipaddr);
  console.log('Server is IP4/IP6 : ' + family);

  var lport = socket.localPort;
  var laddr = socket.localAddress;
  console.log('Server is listening at LOCAL port ' + lport);
  console.log('Server LOCAL ip : ' + laddr);

  console.log('------------remote client info --------------');

  var rport = socket.remotePort;
  var raddr = socket.remoteAddress;
  var rfamily = socket.remoteFamily;

  console.log('REMOTE Socket is listening at port ' + rport);
  console.log('REMOTE Socket ip : ' + raddr);
  console.log('REMOTE Socket is IP4/IP6 : ' + rfamily);

  console.log('--------------------------------------------')
//var no_of_connections =  server.getConnections(); // sychronous version

//get count of all current connections to server
server.getConnections(function(error,count){
  console.log('Number of concurrent connections to the server : ' + count);
});

socket.setEncoding('utf8');

//timeout if socket takes too long
socket.setTimeout(800000,function(){
  // called after timeout -> same as socket.on('timeout')
  // it just tells that soket timed out => its ur job to end or destroy the socket.
  // socket.end() vs socket.destroy() => end allows us to send final data and allows some i/o activity to finish before destroying the socket
  // whereas destroy kills the socket immediately irrespective of whether any i/o operation is goin on or not...force destry takes place
  console.log('Socket timed out');
  socket.end()
});

var chain = {};

if(blockChain.blockchain.length != 0){
  try{

    //socket.write(JSON.stringify(blockChain.blockchain));

  }catch (e){

    console.log(chalk.red(e));

  }
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc used to add a new or unknown node to the node pool stored in RAM
  * @param string protocol - custom protocol request
  * @param number port - the new nodes port
  * @param number ip - new nodes ip address
  * @param string family - new nodes family
  * @return obj - the new node
*/

function new_Node(protocol, port, ip, family){
  var obj = {protocol, port, ip, family};
  return obj;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc helper function to determine, conclusively, if an object is empty or non-empty
  * @param object scoreData - object to be tested
  * @return bool - success or failure
*/

function isEmpty(scoreData) {
  for(var prop in scoreData) {
    if(scoreData.hasOwnProperty(prop)) {
      return false;
    }
  }
  return true;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc compares two objects in several ways to conclusively determine if they are or are not equal
  * @param object x
  * @param object y
  * @return bool - success or failure
*/

function object_equals( x, y ) {
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor

    if ( ! y.hasOwnProperty( p ) ) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal

    if ( typeof( x[ p ] ) !== "object" ) return false;
      // Numbers, Strings, Functions, Booleans must be strictly equal

    if ( ! object_equals( x[ p ],  y[ p ] ) ) return false;
      // Objects and Arrays must be tested recursively
  }

  for ( p in y )
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) )
      return false;
        // allows x[ p ] to be set to undefined

  return true;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc function leverages crypto module to hash buffer according to sha-256 algo
  * @param buffer buffer - temp bytes
  * @return digested hash
*/

var sha256 = function(buffer) {
  //instance of sha256 hashing function
    var f = crypto.createHash("SHA256");

    var h = f.update(buffer);

    return h.digest();

};


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc function leverages crypto module to hash buffer according to ripe-160 algo
  * @param buffer buffer - temp bytes
  * @return digested hash
*/

var ripemd160 = function(buffer) {
  //instance of ripemd160 hashing functions
    var f = crypto.createHash("RIPEMD160");

    var h = f.update(buffer);

    return h.digest();

};


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc aggregates all UTXO for particular address existing on chain
  * @param string address - the address of the wallet to be fetched
  * @return array - of all addresses UTXO
*/

function get_User_Wallet(address){
  //to hold the resulting UTXO
  var total = [];

  //instance of the current coin in wallet
  UTXO = {

  };

  var counter = 0;
  //console.log(blockChain.blockchain);
  try{
    console.log("Scanning Wallet for Oodles...")
  for(var j = 1; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].output.script[2] == address){
        UTXO = {
          block : j,
          index : k,
          amount : blockChain.blockchain[j].data.transaction_Pool[k].output.amount
        };

        total[counter] = UTXO;
        UTXO = {};

        counter++;
      }
    }
    //if(blockChain.blockChain[i].data)
  }

  return total;

  //var newWallet = new wallet(publicKey, privateKey);
  //newWallet.walletAmount()

}catch (e){
  console.log(chalk.red("SERVER ERROR :: " + e));
  return 0;
}
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc aggregates all raw transactions for particular address on chain
  * @param string address - the address of the wallet to be fetched
  * @return array - of all raw transactions for particular address
*/

function get_User_Wallet_Transactions(address){
  //to hold the wallet of all transactions
  var wallet = [];

  transaction = {

  };

  var counter = 0;
  //console.log(blockChain.blockchain);
  try{
    console.log("Gathering wallet for :: " + address);
  for(var j = 1; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].output.script[2] == address){
        wallet[counter] = blockChain.blockchain[j].data.transaction_Pool[k];
        counter++;
      }
    }
    //if(blockChain.blockChain[i].data)
  }

  return wallet;

  //var newWallet = new wallet(publicKey, privateKey);
  //newWallet.walletAmount()

}catch (e){
  console.log(chalk.red("SERVER ERROR :: " + e));
  return 0;
}
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc toString() logs all UTXO for a particular address
  * @param string address - the address of the Wallet to be logged
  * @return array - of all addresses UTXO
*/

function get_User_Wallet_toString(address){
  //console.log(blockChain.blockchain);
  try{
    console.log("Scanning Wallet for Oodles...")
  for(var j = 1; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].output.script[2] == address){
        UTXO = {
          block : j,
          index : k,
          amount : blockChain.blockchain[j].data.transaction_Pool[k].output.amount
        };

        console.log(UTXO);
      }
    }
    //if(blockChain.blockChain[i].data)
  }

  return;

  //var newWallet = new wallet(publicKey, privateKey);
  //newWallet.walletAmount()

}catch (e){
  console.log(chalk.red("SERVER ERROR :: " + e));
  return 0;
}
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc aggregates all UTXO for particular address to be spent in transaction
  * @param object wallet - the wallet of oodles to be spent on a particular transaction
  * @param number amount - the client stated amount of coin needed for particular transaction
  * @return array - of all oodles to be spent
*/

function get_OODLE(wallet, amount){
  //hold all oodles iinstances in particular wallet
  var oodles = [];
  //keep track of total count
  var total = 0;
  var j = 0;

  for(var i = 0; i < wallet.length; i++){
    if(wallet[i].amount >= amount){
      return [wallet[i]];
    }else{
      total += wallet[i].amount;
      oodles[j] = wallet[i];
      j++;
    }
  }
  if(total >= amount){
    // ES5
    //sort oodle wallet from smallest transactions to largest
    oodles.sort((a, b) => (a.amount > b.amount) ? 1 : -1)
    return oodles;
  }
  return 0;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc log entire chain history including all blocks and transactions
  * @return
*/
function get_Chain_History(){
  for(var j = 0; j < blockChain.blockchain.length; j++){
    console.log("Block :: " + j);
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      console.log("   Index :: " + k + " Transaction :: " + JSON.stringify(blockChain.blockchain[j].data.transaction_Pool[k]));
    }
  }
    return;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc get transaction by stated txid
  * @param string txid - the txid to be searched
  * @return bool | transaction - (success or failure) | (transaction of txid)
*/

function get_Transaction(txid){
  for(var j = 0; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].input.txid == txid) return blockChain.blockchain[j].data.transaction_Pool[k];
    }
}
  return false;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc log transaction by txid
  * @param string txid - the txid of the transaction to be logged
  * @return null
*/

function get_Transaction_toString(txid){
  for(var j = 0; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].input.txid == txid) console.log(blockChain.blockchain[j].data.transaction_Pool[k]);
    }
  }

  return;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc gets all transactions by version number
  * @param string version - particular version of possible transactions on the chain to be searched
  * @return transactions - of all matching versions on chain
*/

function get_Transaction_By_Version(version){

  var transactions = [];
  var curr = 0;

  for(var j = 0; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].version == version){
        transactions[count] = blockChain.blockchain[j].data.transaction_Pool[k];

        curr++;
      }
    }
  }

  if(transactions != 0){
    return transactions;
  };
  return 0;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc gets and logs all transactions by version number
  * @param string version - particular version of possible transactions on the chain to be searched
  * @return null
*/

function get_Transaction_By_Version_toString(version){

  for(var j = 0; j < blockChain.blockchain.length; j++){
    for(var k = 0; k < blockChain.blockchain[j].data.transaction_Pool.length; k++){
      if(blockChain.blockchain[j].data.transaction_Pool[k].version == version){
        console.log(blockChain.blockchain[j].data.transaction_Pool[k]);
      }
    }
  }

  return;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc gets all transactions by block and index
  * @param number block - particular block of possible transactions on the chain to be searched
  * @param number index - particular index of possible transactions on the chain to be searched
  * @return transactions | null - (transactions with matching index)
*/

function get_Transaction_By_Index(block, index){
  if(blockChain.blockchain[j].data.transaction_Pool[k] != 0){
    return blockChain.blockchain[j].data.transaction_Pool[k];
  }
  return null;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc logs all retrieved transactions that match provided block and index
  * @param number block - particular block of possible transactions on the chain to be searched
  * @param number index - particular index of possible transactions on the chain to be searched
*/

function get_Transaction_By_Index_toString(block, index){
  if(blockChain.blockchain[j].data.transaction_Pool[k] != 0){
    console.log(blockChain.blockchain[j].data.transaction_Pool[k]);
  }
  return;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc Destroys UTXO used to fund a transaction. Also, logs details
  * @param number funds - the UTXO to be used in a transaction
  * @param number amount - the amount needed for a particular transaction
  * @return bool - success or failure
*/

function destroy_OODLES(funds, amount){
  var initial_amount = 0;
  var new_amount = 0;

  for(var i = 0; i < funds.length; i++){
    initial_amount = blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount;

    if(blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount - amount > 0){
      //subtract amount of transaction from coin amount
      blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount = blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount - amount;
      //get new amount
      new_amount = blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount;
      amount = 0;
    }else{
      //***********************************************************************************************************************************************************

      amount = amount - blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount;
      blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].output.amount = 0;
      new_amount = 0;
    }
    //console.log("Type " + typeof initial_amount + " init " + initial_amount + " newam " + new_amount);
    if(initial_amount >= new_amount){
      if(new_amount == 0){
        console.log(chalk.yellow("Transaction :: " + blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].input.txid + " has been spent"));
      }else{
        console.log(chalk.yellow("Transaction :: " + blockChain.blockchain[funds[i].block].data.transaction_Pool[funds[i].index].input.txid + " has :: " + new_amount + " remaining oodle"));
      }
    }
    if(amount == 0){
      break;
    }
  }

  return false;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc wrapper function
  * @param object transaction - curr transaction in chain
  * @param object previous_transaction - prev transaction in chain
  * @param number index - curr index of curr transaction being validated
  * @return bool - success or failure
*/

function validate_Transaction(transaction, previous_transaction, index){
  return isValidated(transaction, previous_transaction, index);
}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc wrapper function // packages transaction for handling
  * @param object client_Data - ...
  * @param string count - ...
  * @return new_Transaction
*/
//prepare transaction for delivery
function _packageTransaction(client_Data, count){
  var new_Transaction = {};//new transaction(Date.now(), count);
  //new_Transaction.output(client_Data.amount, );

  console.log(new_Transaction);

  return new_Transaction;
}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc wrapper function // packages transaction for handling
  * @param object client_Data - ...
  * @param string count - ...
  * @return new_Transaction
*/
//emit packaged transaction to nodes
function emit_Transaction(new_Transaction){

  clients.write(JSON.stringify(new_Transaction));

}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc wrapper function // checks users wallet for sufficient funds and logs them to the console
  * @param string address - address involved in particular transaction
  * @return  null
*/
function blockChain_toString(){
  try{

    console.log(chalk.green("------------------------Current Block Chain--------------------------"));

    for(var i = 0; i < blockChain.blockchain.length; i++){
      console.log("\nBlock :: " + i + "\n\n" + JSON.stringify(blockChain.blockchain[i]) + "\n");
    }

  }catch (e){

    console.log(chalk.red("BLOCKCHAIN_toSTRING :: ERROR :: " + e));

  }

}

/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc wrapper function // checks users wallet for sufficient funds and logs them to the console
  * @param string address - address involved in particular transaction
  * @return  null
*/
function check_Sum_toString(address){
  if(blockChain.blockchain.length > 0){
    var totals = get_User_Wallet(address);

    if(totals){
      console.log("Found the following oodles under the address :: " + address);
      for(var i = 0; i < totals.length; i++){
        console.log("   " + JSON.stringify(totals[i]));
      }
    }else{
      console.log("No oodles found for the address :: " + address);
    }
  }
  return;
}


/**
  * @version - v1.0.0
  * @auth Joshua Richard
  * @desc Adds a new transaction to the transaction pool in RAM for validation
  * @param string transaction - curr transaction to be added to pool
  * @return bool - success or failure
*/

function add_To_Pool(transaction){
  //_packageTransaction(client_Data, count);

  transaction_Pool[count] = transaction;

  try{

    if(transaction_Pool[count] == transaction){
      console.log(chalk.green("Transaction :: " + JSON.stringify(transaction) + " added to TRANSACTION_POOL"));

      count++;
      return true;
    }

  }catch (e){

    console.log(chalk.red("ERROR adding transaction to POOL :: " + e));

  }

  console.log(chalk.red("ERROR adding transaction to POOL"));
  return false;
}


//*************************************************************************************************************************************
// When client sends data to node
//*************************************************************************************************************************************
socket.on('data',function(client_Data){
  var bread = socket.bytesRead;
  var bwrite = socket.bytesWritten;

  console.log('Bytes read : ' + bread);
  console.log('Bytes written : ' + bwrite);
  console.log('Data sent to server : ' + client_Data);

//console.log("Count " + count + " " + POOL_REQ);

  //}else{
    //data from client side sent through tcp handler
    var user_input = JSON.parse(client_Data);

    //the protocol for pseudo interpreter
    const protocol = user_input.protocol;
    var wallet_Address = user_input.publicKey;

    //*********************************************************
    //commands for stack based interpreter/validator
    //*********************************************************

    var      OP_ADD         = 0x93;   //add two arguments on stack

    var      OP_DUP         = 0x76;   //duplicate stack elements

    var      OP_HASH160     = 0xa9;   //hash pub key  - ripemd160 ^ 2

    var      OP_EQUALVERIFY = 0x88;   //verify both sigs are the same

    var      OP_CHECKSIG    = 0xac;   //validate and compare DER signatures

    var      OP_HALT        = 0x94;   //halt program

    //***********************************************************************************************
    //server side custom tcp protocl to add request types between client and server architecture/ mesh network
    //***********************************************************************************************
    switch (protocol) {

      //**************************************************************************************************
      //"Cash To Oodle (CTO)"
      //occurs when users buy oodle with traditional money supply
      //**************************************************************************************************

      case 1: //CTO

        //amount the user is buying
        var amount = user_input.amount;
        //the address they would like to buy the coin for
    		const pub_key = user_input.pub_key;

        try{

          amount = parseFloat(amount);

        }catch (e){

          console.log(chalk.red("ERROR :: expecting amount of type FLOAT, instead got typeof :: " + typeof amount));

        }
        //create new transaction object at current time and index
    		var new_Transaction = new transaction(Date.now(), count);

    		try{
          //hash transaction
    			var hash = new_Transaction.ripemd160(new_Transaction.sha256(pub_key));

    		} catch (e){

    			console.log(chalk.red('FAILED to Hash :: ' + e));

    		}
        //public key address stored in transaction
    		var pub_key_address = hash.toString('hex');

        //script stored in coin for interpreter
    		var output_script = [OP_DUP, OP_HASH160, pub_key_address, OP_EQUALVERIFY, OP_CHECKSIG];

        //creating transaction unlocking script, current empty until its spent
        new_Transaction.input(count, []);
        //output "locking" script
    		new_Transaction.output(amount, output_script);

    		console.log(pub_key + " :: " + JSON.stringify(new_Transaction));

    		try{

    	     add_To_Pool(new_Transaction);

    		} catch (e){

    			console.log(chalk.red("Send Transaction FAILED :: " + e));

    		}

        break;

      //**************************************************************************************************
      //"Peer to Peer (@P2P)"
      //occurs during any user to user transaction
      //**************************************************************************************************

      case 2: //P2P

        /**
        *@publickey sending coin
        *@privatekey sending coin
        *@amount that is being sent
        *@address of the receiver of the new coin
        **/
        const public_key = user_input.pub_key;
        const priv_key = user_input.priv_key;
        var amounts = user_input.amount;
        const dest_address = user_input.dest_address;

        try{

          amounts = parseFloat(amounts);

        }catch (e){

          console.log(chalk.red("ERROR :: expecting amount of type FLOAT, instead got typeof :: " + typeof amounts));

        }

        try{
          //hash public key to public key hash using ripemd160 and sha256 elliptic curve hashing
          var pub_hash = ripemd160(sha256(public_key));

        } catch (e){

          console.log(chalk.red('FAILED to Hash :: ' + e));

        }

        //public key address to be stored in transaction
        var pub_address_hash = pub_hash.toString('hex');
        console.log(pub_hash.toString('hex'));

        //gather senders coin locations on block chain
        var payer_wallet = get_User_Wallet(pub_address_hash);

        //gather actual coin from users wallet
        const OODLE = get_OODLE(payer_wallet, amounts);

        //as long as there is coin to be spent
        if(OODLE != 0){
          console.log("Oodle to be spent :: " + OODLE);

          //gather the coins that are to be spent and store in array
          var funds_F_T = [];
          console.log(OODLE);
          for(var i = 0; i < OODLE.length; i++){
            funds_F_T[i] = blockChain.blockchain[OODLE[i].block].data.transaction_Pool[OODLE[i].index];
          }

          //begin to structure coin for receiver using new instance of transaction object
          var new_Transactions = new transaction(Date.now(), count);

          try{

      			//var pub_hash = new_Transactions.ripemd160(new_Transactions.sha256(dest_address));

      		} catch (e){

      			console.log(chalk.red('FAILED to Hash :: ' + e));

      		}

          //pub key address to be used to verify transaction
      		var pub_verify = pub_hash.toString('hex');

          //structure locking script using interpreter commands and the destination address
      		var output_script = [OP_DUP, OP_HASH160, dest_address, OP_EQUALVERIFY, OP_CHECKSIG];


          //use buffer to convert public and private keys to raw byte data
          var pu_key = new Buffer.from(public_key, 'hex');
          var pr_key = new Buffer.from(priv_key, 'hex');

          //sctructure unlocking script with pub key address to verify ownership
          var data = [OP_DUP, OP_HASH160, pub_address_hash, OP_EQUALVERIFY, OP_CHECKSIG];

          //hashcode to verify the users signature
          var hashcode = sha256 (sha256 (new Buffer.from(data)));

          //sign signature to verify coin ownership
          var signature = ecdsa.sign(hashcode, pr_key);//.signature;


        // We create a previous transaction with an output

        // We skip other data that are not required for validation

        //pub key address to verify signature
        var ver = ripemd160(sha256(public_key));
        ver = ver.toString('hex');

        //aggregate input script/ unlocking script
        var input_script = [signature, public_key];

        //aggregate new transaction and store in transaction object
        new_Transactions.input(count, input_script);
      	new_Transactions.output(amounts, output_script);


      //	console.log(public_key + " :: " + JSON.stringify(new_Transactions));






        //convert signature to DER format
        var signatureDER = signature.toDER();

        //store DER signature as uint8 array
        signatureDER = new Uint8Array(signatureDER);
        //import signature using secp256k1 module
        signatureDER = secp256k1.signatureImport(signatureDER); // Decode a DER signature

        console.log(ecdsa.verify(hashcode, signature, pu_key));
        //console.log("ddedd" + ecdsa.verify(sha256 (sha256 (new Buffer.from("d"))), signature, pu_key));
        //console.log("yo");

      // We create a previous transaction with an output

      // We skip other data that are not required for validation

      //var privKe = "";
      //var pubKe = "0321454dd740878e06f070f35ca238baa491d988e2749d3bf11c7b3e782c3e16b9";

      console.log("pubkey    " + public_key)
      var ver = ripemd160(sha256(public_key));
      ver = ver.toString('hex');
      console.log("ver   " + ver);






      	try{

          //boolean flag
          var bool = true;
          //console.log("Trans" + transactions);

          //validate all coins used in transaction
          for(var i = 0; i < funds_F_T.length; i++){
            if(validate_Transaction(new_Transactions, funds_F_T[i], 0)){

            }else{
              //change flag
              bool = false;
              console.log(chalk.red("Transaction was INVALID"));
            }
          }
          //if transactions are valid attempt to add to chain and destory prev coin
          if(bool){
            //add to pool
            if(add_To_Pool(new_Transactions)){
              //destroy coin
              destroy_OODLES(OODLE, amounts);
            }
          }

        } catch (e){

          console.log("Validate Transaction FAILED :: " + e);

      	}


      }else if(Array.isArray(OODLE)){
          //Insufficient Funds

          console.log("Insufficient Funds");
        }

        break;

      //**************************************************************************************************
      //Memory(MEM)"
      //sends entire memory of the chain to the client
      //**************************************************************************************************

      case 3: //MEM
      //write entire history of chain to web client to display on webpage
        socket.write(JSON.stringify(blockChain.blockchain));
        console.log("SERVER wrote Chain data to IP :: " + family + " port :: " + port);

        break;

      //**************************************************************************************************
      //"Wallet (WALLET)"
      //sends particular users wallet to the client
      //**************************************************************************************************

      case 4: //WALLET
      //give users aggregated wallet to the client
        var wallet = get_User_Wallet_Transactions(ripemd160(sha256(wallet_Address)).toString('hex'));

        //sort wallet from lowest coin value to highest for efficiency purposes
        wallet.sort((a, b) => (a.output.amount > b.output.amount) ? 1 : -1);

        //write to client
        socket.write(JSON.stringify(wallet));
        console.log("SERVER wrote Chain data to IP :: " + family + " port :: " + port);

        break;
      case 5: //RESET
      //emmitted when node wins block

        break;
      case 6: //NEW
      //EMMITTED when node joins network and/or new nodes are made known to other nodes on the network
      default:
        console.log("Invalid Protocol Provided");
    }
  /////}

  //**************************************************************************************************
  //if node isnt currently mining and the pool requirement has been met
  //**************************************************************************************************
  if(count - 1  == POOL_REQ && isMining == false){
    //set pool requirement count to zero
    count = 0;

    /**
    *Use node js worker threads to asyncronously MINE
    *Allows system to still process requests and communicate with other nodes while Mining
    *Enables system to end mining process if other node wins etc.
    **/

    if (isMainThread) {

      //create new worker thread at threads/thread
      const worker = new Worker('./threads/thread.js');

      //gather current block data and store as string
      var temp_Chain = JSON.stringify(blockChain);

      //encode utf-8 to Uint8Array
      //instantiate encode and decode objects
      var enc = new TextEncoder(); // always utf-8
      var decoder = new TextDecoder("utf-8");

      //encode temp chain to Uint8Array
      temp_Chain= enc.encode(temp_Chain);

      //convert to uint32 array type
      temp_Chain = new Int32Array(temp_Chain);

      //create shared buffer and allocate required bytes
      var sharedBuffer = new SharedArrayBuffer();
      //console.log("Index " + index);

      //************************************************************
      //NOTE temp allocation of memory to be updated for more efficient usage
      //Currently uses hardcoded memory allocation relative to particular transaciton pool Size
      //Dynamically adds memory but not proportionally as is
      //************************************************************
      if(index == 1){
        //Create new shared buffer to share memory between main thread and worker thread
        sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * temp_Chain.length * 5);
      }else{
        //same
        sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * temp_Chain.length * 2);
      }

      //shared memory chain of type TYPED ARRAY
      var shared_Chain = new Int32Array(sharedBuffer);

      //instantiate a shared array buffer with a typed int32 array
      //use text encoder to encode individual array elements to their utf8 values
      //dynamically asign said utf8 values to typed array buffer

      //for(var i = 0; i < typed.length; i++){
        //arr[i] = enc.encode(typed[i]);
      //}

      //called when worker thread sends message
      worker.on("message", function(message){
        try{
          console.log(chalk.green("From WORKER THREAD  :: STATUS :: " + message));
          //message has null properties that need to be eliminated
          //do so by first finding then trimming said null elemenets
          //this grabs first instance
          var null_Index = shared_Chain.indexOf(0);

          //if(null_Index != -1){
            var temp = new Int32Array();

            var newchain = shared_Chain;

            //trim null elements i.e. "[0]"
            temp = newchain.slice(0, null_Index);

            //convert to Uint 8 to decode and store as uint8 type object
            var new_chain = new Uint8Array(temp);
            new_chain = decoder.decode(new_chain);

            new_chain = JSON.parse(new_chain);

            blockChain = new_chain;
            isMining = false;

            blockChain_toString();

          //}else{
            //console.log(chalk.red("Main thread :: MEMORY ERROR"));
          //}

        }catch (e){

          console.log(chalk.red("Main Thread :: ERROR" + e));

        }
        //after its clear thread has mined block main thread sends a message for it to shut down
        worker.postMessage({exit: true});

      });
      //log worker thread errors to main thread server
      worker.on("error", console.log);
      //log worker thread exit to main thread
      worker.on("exit", console.log);

      var messages = {
        //protocol varies on curr situation
        protocol: 3,
        //intially set to false, subject to change
        exit: false,
        //contains any data that needs to be shared between the two
        data: {
          index: 3,
          //could be full or null depending
          transaction_Pool: 2//transaction_Pool
        }
      };

      //fill arr with array elements
      for(var i = 0; i < temp_Chain.length; i++){
        shared_Chain[i] = temp_Chain[i];
      }

      //Raw chain type Int32Array

      //gather current transaciton pool data to send to thread to be mined
      var pool = transaction_Pool;

      //flag for server if thread is mining
      isMining = true;

      //send data to worker thread
      worker.postMessage({shared_Chain, pool, index})
      //setTimeout(() => {
        //console.log(chalk.yellow("Worker thread for MINER node at PORT :: " + port + " :: has been TERMINATED"));
        //replace worker.terminate(); with something like
        //console.log("buff " +arr[0]);
        //console.log(arr);

        //worker.postMessage({ exit: true });
        // maybe add another setTimeout with worker.terminate() just in case?
      //}, 5000);
    } else {

    }

    //increment current block index
    index = index + 1;
    //empty transaciton pool
    transaction_Pool = [];

    //set flag to true to dump server data
    flag = true;
  }

  if(flag){
    try{
      for(var i = 0; i < blockChain.blockchain.length; i++){
        console.log(chalk.green("\nBlock :: " + i + " " + JSON.stringify(blockChain.blockchain[i]) + "\n"));
      }

      //console.log("Nodes Earned Coin :: " + newUser.coin);
      socket.write(JSON.stringify(blockChain.blockchain));

    }catch (exception){
      console.log(exception);
    }

    //dump kernel buffer data
    var is_kernel_buffer_full=true ;//= socket.write('Node : ' + server.address().port + ' successfully added Block :: ' + JSON.stringify(blockChain, null, 4));
    if(is_kernel_buffer_full){
      console.log('Data was flushed successfully from kernel buffer i.e written successfully!');
      flag = false;
    }else{
      socket.pause();
    }
}
});

socket.on('rand',function(data){
  console.log("new data: " + data)
});

//drain socket
socket.on('drain',function(){
  console.log('write buffer is empty now .. u can resume the writable stream');
  socket.resume();
});

//on socket error log error
socket.on('error',function(error){
  console.log('Error : ' + error);
});

//on socket timeout log to server
socket.on('timeout',function(){
  console.log('Socket timed out !');
  socket.end('Timed out!');
  // can call socket.destroy() here too.
});

//on socket end log data to server
socket.on('end',function(data){
  console.log('Socket ended from other end!');
  console.log('End data : ' + data);
});

//on socket close log to server
socket.on('close',function(error){
  var bread = socket.bytesRead;
  var bwrite = socket.bytesWritten;
  console.log('Bytes read : ' + bread);
  console.log('Bytes written : ' + bwrite);
  console.log('Socket closed!');
  if(error){
    console.log('Socket was closed coz of transmission error');
  }
});

//set timeout for socket ot disconnect from server
setTimeout(function(){
  var isdestroyed = socket.destroyed;
  console.log('Socket destroyed:' + isdestroyed);
  socket.destroy();
},1200000);

});


//
//END CONNECT
//




// emits when any error occurs -> calls closed event immediately after this.
server.on('error',function(error){
  console.log('Error: ' + error);
});

//emits when server is bound with server.listen
server.on('listening',function(){
  console.log('Port :: ' + server.address().port);
});

server.maxConnections = 10;

//static port allocation
server.listen(2222);

// for dyanmic port allocation
//server.listen(function(){
  //var address = server.address();
  //var port = address.port;
  //var family = address.family;
  //var ipaddr = address.address;
  //console.log('Server is listening at port' + port);
  //console.log('Server ip :' + ipaddr);
  //console.log(ipaddr);
  //console.log('Server is IP4/IP6 : ' + family);
//});


//store listening
var islistening = server.listening;

//check to see if server is currently listening and log
if(islistening){
  console.log(chalk.green('Server STATUS :: Listening'));
}else{
  console.log(chalk.red('Server STATUS :: Not Listening'));
}

//set timeout for server to shut off after given period of time
//*NOTE* remove at release
setTimeout(function(){
  server.close();
},5000000);
