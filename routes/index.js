var express = require('express');
var path = require('path');
var net = require('net');
const readline = require("readline");

var secp256k1 = require('secp256k1')

let user = require('../models/User')
let wallet = require('../models/Wallet')
let header = require('../public/script/embedded_html')
const newUser = new user();

//var new_Transaction = new transaction(0, '0001', Date.now());

var router = express.Router();

var ssn;

router.get('/', function (req, res, next) {
	res.render('index.ejs', {
		header: header
	});
});

router.get('/email', function (req, res, next) {
	res.render('email.ejs', {
		header: header
	});
});


router.get('/root', function (req, res, next) {
	res.render('root.ejs', {
		header: header
	});
});

router.get('/send', function (req, res, next) {
	pubKey = newUser.publicKey;
	publicKey = Buffer.from(pubKey).toString('hex')

	res.render('landing.ejs', {
		privateKey: newUser.privateKey.toString('hex'),
		publicKey: publicKey,
		address: newUser.address,
		amount: 0,
		header: header
	});
});

router.get('/buy', function (req, res, next) {
	res.render('buy.ejs', {
		header: header
	});
});

function send_Data(transaction){

var hold = "";
var flag = false;

		//*************************************************************************************************************************************
		// BEGIN CLIENT SIDE TCP CONNECTION TO NODE
		//*************************************************************************************************************************************

	const clients = net.connect({port: 2222}, (err) => {
		if(err) console.log( err);

		console.log(clients.address());

		// 'connect' listener
		console.log('connected to server!');

			//var new_Transaction = emit_Transaction(req.body);
			clients.write(JSON.stringify(transaction));

	});
	clients.on('data', (data) => {
		//console.log(data.toString());

		if(transaction.protocol == 3){
			flag = true;
			hold = data.toString();
			return new Promise(resolve => {
		 			resolve(data.toString());
 			});
		}
		//clients.end();
	});
	clients.on('end', () => {
		console.log('disconnected from server');
		//res.send({"Success":"Success!"});
	});

	//*************************************************************************************************************************************
	// END CLIENT SIDE TCP CONNECTION TO NODE
	//*************************************************************************************************************************************
	if(flag){
		console.log(hold);
	return new Promise(resolve => {
			resolve("hey");
	});
}
}

async function get_Transactions(data){
	const transaction_Packet = await send_Data(data);

	return transaction_Packet;

}
router.post('/buys', function (req, res, next) {
	var protocol =  001;

	if(req.body){

		var amount = req.body.amount;
		var pub_key = req.body.pub_key;

		var data = {
			protocol: protocol,
			amount: amount,
			pub_key: pub_key
		};

		try{

			send_Data(data);

		} catch (e){

			console.log("SERVER ERROR :: " + e);

		}
		res.send({"Success":"Success!"});
	}else{
		res.send({"Success":"Failure!"});
	}

});

router.get('/transactions', function (req, res, next) {
	console.log('Client called :: /transactions');
	var data = {
		protocol: 3
	};

	const clients = net.connect({port: 2222}, (err) => {
		if(err) console.log( err);

		console.log(clients.address());

		// 'connect' listener
		console.log('connected to server!');

			//var new_Transaction = emit_Transaction(req.body);
			clients.write(JSON.stringify(data));

	});
	clients.on('data', (data) => {
		console.log("Client REQUESTED chain data");

		data = JSON.parse(data);

		console.log(data);

		res.render('transactions.ejs', {
			'blocks': data,
			header: header
		});
		//clients.end();
	});
	clients.on('end', () => {
		console.log('disconnected from server');
		//res.send({"Success":"Success!"});
	});
});

router.post('/transaction', function (req, res, next){
console.log('Client called :: /transaction');
try{
	var uint = Uint8Array.from(Buffer.from(req.body.priv_key, 'hex'));
	var result = secp256k1.publicKeyCreate(uint);
	result = Buffer.from(result, 'uint8');
	result = result.toString('hex');
}	catch(e){
	console.log("SERVER ERROR :: " + e);
}


if(result == req.body.pub_key){
	var transaction = req.body;

	transaction.protocol = 002;

	try{

		send_Data(transaction);

	} catch (e){

		console.log("SERVER ERROR :: " + e);

	}

}else{
	console.log("/transaction says :: 'INVALID KEY PAIR PROVIDED'");
}
});

router.get('/blocks', function (req, res, next) {
	console.log('Client called :: /blocks');
	var data = {
		protocol: 3
	};

	const clients = net.connect({port: 2222}, (err) => {
		if(err) console.log( err);

		console.log(clients.address());

		// 'connect' listener
		console.log('connected to server!');

			//var new_Transaction = emit_Transaction(req.body);
			clients.write(JSON.stringify(data));

	});
	clients.on('data', (data) => {
		console.log("Client REQUESTED chain data");

		data = JSON.parse(data);

		console.log(data);

		res.render('blocks.ejs', {
			'blocks': data,
			header: header
		});
		//clients.end();
	});
	clients.on('end', () => {
		console.log('disconnected from server');
		//res.send({"Success":"Success!"});
	});
});

router.get('/wallet', function (req, res, next) {
	console.log('Client called :: /wallet');
	var data = {
		protocol: 4,
		address: '15CZaEap36dNXgxVCm68PZvUZ2nhcKvmBMH4NpcbgCHiC5hcBJy',
		publicKey: '02290952959b15cac9f73adab92b3822413624b0f594ae4cf40bb7f3398bb5ace1'
	};

	const clients = net.connect({port: 2222}, (err) => {
		if(err) console.log( err);

		console.log(clients.address());

		// 'connect' listener
		console.log('connected to server!');

			//var new_Transaction = emit_Transaction(req.body);
			clients.write(JSON.stringify(data));

	});
	clients.on('data', (data) => {
		console.log("Client REQUESTED chain data");

		data = JSON.parse(data);

		console.log(data);

		res.render('wallet.ejs', {
			'blocks': data,
			header: header
		});
		//clients.end();
	});
	clients.on('end', () => {
		console.log('disconnected from server');
		//res.send({"Success":"Success!"});
	});
});
	//connection.query("SELECT * FROM classes WHERE search_code= '"+req.session.search_code+"'", function (err, result, fields)
	//connection.query("SELECT * FROM classes WHERE search_code= '"+req.body.search_code+"'", function (err, result, fields) {
		//if (err) throw err;

module.exports = router;
