//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file interpreter.js
//@descr stack based compiler and interpreter meant to read and process script commands embedded in the Oodle coin network
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************


var crypto = require('crypto');
var EC = require('elliptic').ec;
var secp256k1 = require('secp256k1');
var ecdsa = new EC('secp256k1');
var format = require('ecdsa-sig-formatter');
var forge = require('node-forge');

let user = require('../models/User')

var sha256 = function(buffer) {

    var f = crypto.createHash("SHA256");

    var h = f.update(buffer);

    return h.digest();

};


var ripemd160 = function(buffer) {

    var f = crypto.createHash("RIPEMD160");

    var h = f.update(buffer);

    return h.digest();

};



Buffer.prototype.toReverseHexaNotation = function () {

    var hexa = "";

    for (var i = this.length-1; i >= 0; i--) {

       var digits =  this[i].toString(16);

        hexa += ("0" + digits).slice(-2); // Add "0" for single digit

    }

    return hexa;

};


var numberToInt8 = function (n) {

    return new Buffer([n]);

};


var numberToInt32LE = function (n) {

    var buffer = new Buffer(4);

    buffer.writeUInt32LE(n,0);

    return buffer;

};


var numberToInt64LE = function (n) {

   var buffer = new Buffer(8);

   buffer.writeUInt32LE(n % 0xFFFFFFFFFFFFFFFF, 0);

   buffer.writeUInt32LE(Math.floor(n / 0xFFFFFFFFFFFFFFFF), 4);

   return buffer;

};


var serializeAmount = function (amount) {

    return numberToInt64LE(amount * 100000000);

};


var hexaNotationToInt256LE = function (hexa) {

    var bytes = new Array(32);

    for (var i = 0, j = 31, len = hexa.length; i < len; i+=2, j--) {

        bytes[j] = parseInt(hexa[i]+hexa[i+1],16);

    }

    return new Buffer(bytes);

};



var      OP_ADD         = 0x93;

var      OP_DUP         = 0x76;

var      OP_HASH160     = 0xa9;

var      OP_EQUALVERIFY = 0x88;

var      OP_CHECKSIG    = 0xac;

var      OP_HALT        = 0x94;

//console.log(OP_ADD + "  " + OP_DUP + " " + OP_HASH160 + " " + OP_EQUALVERIFY + " " + OP_CHECKSIG + " " + OP_HALT);



var serializeTransaction = function(tr) {
    var buffers = [];

    buffers.push(numberToInt32LE(tr.version));

    buffers.push(serializeInputs(tr.inputs));
    //console.log(tr.inputs);
    buffers.push(serializeOutputs(tr.outputs));

    buffers.push(numberToInt32LE(tr.lockTime));

    if (tr.hashType)

        buffers.push(numberToInt32LE(Number(tr.hashType)));

    return Buffer.concat(buffers);

};


var serializeInputs = function (inputs) {

    var buffers = [];


    var inputsSize = inputs.length;

    buffers.push(numberToInt8(inputsSize));


    for (var i = 0; i < inputsSize; i++) {

        var input = inputs[i];


        buffers.push(hexaNotationToInt256LE(input.txid));

        buffers.push(numberToInt32LE(input.index));
        JSON.stringify(input.script);
        buffers.push(compileScript(input.script));

        buffers.push(numberToInt32LE(0xffffffff));

    }

    return Buffer.concat (buffers);

};


var serializeOutputs = function (outputs) {

    var buffers = [];


    var outputsSize = outputs.length;

    buffers.push(numberToInt8(outputsSize));

    for (var i = 0; i < outputsSize; i++) {

        var output = outputs[i];

        buffers.push(serializeAmount(output.amount));

        buffers.push(compileScript(output.script));

    }

    return Buffer.concat (buffers);

};


var compileScript = function(program) {

    var buffers = [];

    var bytes = 0;

    for (var i = 0, len = program.length; i < len; i++) {

        var code = program[i];

        var type = typeof(code);

        switch (type) {

            case 'number':
              //console.log(code);
                buffers.push(numberToInt8(code));

                bytes++;

                break;

            case 'string':
                //console.log("string" + code);
                var operand = new Buffer(code, 'hex');
                //console.log(operand);
                buffers.push(numberToInt8(operand.length));

                buffers.push(operand);

                bytes += operand.length + 1

                break;
            case 'object':
              var operand = new Buffer.from(JSON.stringify(code));
              //console.log("object"+operand);
              buffers.push(numberToInt8(operand.length));

              buffers.push(operand);

              bytes += operand.length + 1
              break;

        }

    }

    buffers.unshift(numberToInt8(bytes));
    for(var m = 0; m < buffers.length; m++){
      //console.log(buffers[m]);
    }
    //console.log('\n')
    var hold = Buffer.concat(buffers);

    return Buffer.concat(buffers);      //return array buffer of program

};


// A simple virtual machine to run a decoded P2SH (Pay to Script Hash) scripts




var runScript = function (program, stack, currentTransaction, currentInputIndex) {
    var operand;

    var operand1;

    var operand2;

    var ip = 0; // instruction pointer

    var last = program[ip++];

    while (ip <= last) {

        var instruction = program[ip++];

        switch (instruction) {

            case OP_DUP:
            console.log("OP_DUP");

                operand = stack.pop();  //public Key 275... Problem no....

                stack.push(operand);
                //console.log(operand);
                stack.push(operand);

                break;


             case OP_ADD:
            console.log("OP_ADD");
                operand1 = stack.pop().readInt32LE();
                operand2 = stack.pop().readInt32LE();

                stack.push(numberToInt32LE(operand1 + operand2));

                break;


            case  OP_HASH160:
            console.log("OP_HASH160");
                operand = stack.pop();  //public key 275...

                stack.push(ripemd160(sha256(operand.toString('hex'))));

                break;


            case  OP_EQUALVERIFY:
            console.log("OP_EQUALVERIFY");
                //no worries
                operand1 = stack.pop();   //BOTH SHOULD BE RESULT TO 45...
                //no worries
                operand2 = stack.pop();

                console.log(operand1.toString('hex') + " " + operand2.toString('hex'));
                if (! operand1.compare(operand2) == 0) return false;

                break;


            case  OP_CHECKSIG:
            console.log("OP_CHECKSIG");

                operand1 = stack.pop(); //public key

                operand2 = stack.pop(); //signature, with sighash at the end

                // operand 1 is Public Key

                var publicKey = operand1;


                // operand 2 contains hashType

                //var hashType = operand2[operand2.length-1]; //get last byte of signature


                // operand 2 contains DER Signature

                var hashType = 1;
                //var hashType = operand2[operand2.length-1]; //get last byte of signature

                try{

                  var signatureDER = JSON.parse(operand2);
                  var hash = ripemd160(sha256(publicKey)).toString('hex');

                }catch (e){

                  console.log(e);

                }

                var data = [];
                data[0] = OP_DUP;
                data[1] = OP_HASH160;
                data[2] = hash;
                data[3] = OP_EQUALVERIFY;
                data[4] = OP_CHECKSIG;

                //console.log(signatureDER);
                //console.log(signatureDER.toString('hex'));

                //var signature = secp256k1.signatureImport(signatureDER); // Decode a signature in DER format
                //signature = new Buffer(signature, 'uint8');


                // recover signed transaction and hash of this transaction
                var d = "hey";

                var hashco = sha256 (sha256 (new Buffer.from(data)));

                console.log("Outcome :: " + ecdsa.verify(hashco, signatureDER, publicKey));

                var copy = copyForSignature(currentTransaction, currentInputIndex, hashType);
//console.log(JSON.stringify(copy)+ " fasfdfasdf");
//console.log(" Copy " + JSON.stringify(copy));
                //console.log(signatureDER.toString('hex'));
                var buffer = serializeTransaction(copy);

                var hashcode = sha256 (sha256 (buffer));

                // Check signature
                //console.log("run " + ecdsa.verify(hashcode, signatureDER, publicKey));
                if (! ecdsa.verify(hashco, signatureDER, publicKey)) return false;

                break;
            case OP_HALT:
                ip = last;
                break;

            default:

                var size = instruction;


                //size  = 72
                //yoooo30450221009eb819743dc981250daaaab0ad51e37ba47f7fb4ace61f6a69111850d6f2990502206b6e59e1c002a4e35ba2be4d00366ea0f3e0b14c829907920705bce336ab294501
                //size = 33
                //yoooo0275e9b1369179c24935337d597a06df0e388b53e8ac3f10ee426431d1a90c1b6e
                //size = 20
                //yoooo4586dd621917a93058ee904db1b7a43bfc05910a
                //
                var data  = new Buffer(size);

                program.copy(data, 0, ip, size+ip);
                //console.log("yoooo" + data.toString('hex'));

                stack.push(data);

                ip += size;

                break;

        }

    }

    return true;

};

var SIGHASH_ALL          = "01";

var SIGHASH_NONE         = "02";

var SIGHASH_SINGLE       = "03";

var SIGHASH_ANYONECANPAY = "80";


// We create a previous transaction with an output

// We skip other data that are not required for validation


  //const newUser = new user();


  var dbtx = {};










var copyForSignature = function(transaction, inputIndex, hashType) {

    var copy = Object.assign({}, transaction);


    var inputs = copy.inputs;

    for (var i = 0, len = inputs.length; i < len; i++) {

        inputs[i].script = []; // reset script to nothing

    }


    var currentInput = inputs[inputIndex];


    var previousTransaction =  dbtx[currentInput.txid];

    var previousOutput =previousTransaction.outputs[currentInput.index];


    currentInput.script = previousOutput.script;


    copy.hashType = hashType;

    return copy;

};


var validateInput = function (transaction, previous_transaction, inputIndex) {
  console.log("made it!");
  console.log(transaction);
  console.log("-------------");
  console.log(previous_transaction);
try{
//console.log("tx " + typeof previous_transaction.input.txid);
    dbtx[transaction.input.txid] = previous_transaction;

    dbtx[previous_transaction.input.txid] = transaction;

    var stack = [];

    var input = transaction.input;

    var previousTransaction =  dbtx[input.txid];

    var previousOutput =previousTransaction.output;


    var program1 = compileScript(input.script);

    var program2 = compileScript(previousOutput.script);


    var result = runScript (program1, stack, transaction, inputIndex);

    if (result) result = runScript (program2, stack, transaction, inputIndex);

  }catch (e){
    console.log("INTERPRETER ERROR :: " + e);
  }
    return result;

};
//var currentTransaction = transaction;

//var currentInputIndex  = 0;

//console.log(validateInput(currentTransaction, currentInputIndex));


var y = [

        OP_DUP,

        OP_HASH160,

        '4753945f3b34d6ca3fedcf41bf499c13d20bfec4',

        OP_EQUALVERIFY,

        OP_CHECKSIG

];

var x = [

        OP_DUP,

        OP_HASH160,

        '4753945f3b34d6ca3fedcf41bf499c13d20bfec4',

        OP_EQUALVERIFY,

        OP_CHECKSIG

];


jake = "0252efbfc0517e8ba2a2e66c2534ec33135168d6f6bc93325e0b16434a14d35778";
var val = ripemd160(sha256(jake));
//console.log("fuck jake ; " + val.toString('hex'));

module.exports = validateInput;
