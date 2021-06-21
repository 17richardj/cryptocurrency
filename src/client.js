var net = require('net');
const readline = require("readline");

let user = require('./models/User')
let transaction = require('./models/Transaction')

//prepare transaction for delivery
function _packageTransaction(){

  const newUser = new user();

  var new_Transaction = new transaction(0, '0001', Date.now());

  new_Transaction.input(newUser.address.toString('hex'), newUser.address.toString('hex'), 10);

  console.log(new_Transaction);

  return new_Transaction;
}

//emit packaged transaction to nodes
function emit_Transaction(new_Transaction){

  clients.write(JSON.stringify(new_Transaction));

}

const clients = net.connect({port: 2222}, (err) => {
  if(err) throw err;

  var handlerId = 2000;
  var data = { message: 'foobar' };
  var nodes = [
      { address: '127.0.0.1', port: 2222}
  ];

  console.log(clients.address());

  // 'connect' listener
  console.log('connected to server!');

    var new_Transaction = _packageTransaction();

    // call the rest of the code and have it execute after 3 seconds
    setTimeout(function() {
    emit_Transaction(new_Transaction);
  }, 4000);

});
clients.on('data', (data) => {
  console.log("From server" + JSON.parse(data));
  var wallet = new Wallet()
  clients.end();
});
clients.on('end', () => {
  console.log('disconnected from server');
});
