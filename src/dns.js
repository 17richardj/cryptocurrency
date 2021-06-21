
//****************************************************
//DNS SERVER
//****************************************************

//concurrent nodes stored in dns hashmap key value store
//let port_Store = new Map();
let port_Store = {DNS:[{node:{
  address: './0',
  port: 0,
  host: '.'
}}]}


var index = 0;

// creates the server
var dns = net.createServer();

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

//
//BEGIN SOCKET.IO
//
// Expose the node_modules folder as static resources (to access socket.io.js in the browser)
// Require HTTP module (to start server) and Socket.IO



io.on("connection", function (socket) {
  console.log("Made socket connection");
});


//
//END SOCKET.IO
//


// emitted when new client connects
dns.on('connection',function(socket){

//this property shows the number of characters currently buffered to be written. (Number of characters is approximately equal to the number of bytes to be written, but the buffer may contain strings, and the strings are lazily encoded, so the exact number of bytes is not known.)
//Users who experience large or growing bufferSize should attempt to "throttle" the data flows in their program with pause() and resume().

  console.log('Buffer size : ' + socket.bufferSize);

  console.log('---------server details -----------------');

  var address = dns.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log('DNS is listening at port' + port);
  console.log('DNS ip :' + ipaddr);
  console.log('DNS is IP4/IP6 : ' + family);

  var lport = socket.localPort;
  var laddr = socket.localAddress;
  console.log('DNS is listening at LOCAL port ' + lport);
  console.log('DNS LOCAL ip : ' + laddr);

  console.log('------------remote Node info --------------');

  var rport = socket.remotePort;
  var raddr = socket.remoteAddress;
  var rfamily = socket.remoteFamily;

  console.log('REMOTE Socket is listening at port ' + rport);
  console.log('REMOTE Socket ip : ' + raddr);
  console.log('REMOTE Socket is IP4/IP6 : ' + rfamily);

  console.log('--------------------------------------------')

  var hold = raddr + "/" + rport;

  var flag = true;

  for(var i = 0 ; i < port_Store.DNS.length; i++){
    if(port_Store.DNS[i].node.address == hold){
      flag = false;
      break;
    }
  }
  var newNode = {node: {
    address : hold,
    port: rport,
    host: raddr
  }};

  if(flag){
    try{
      port_Store.DNS.push(newNode);

      console.log(chalk.green("DNS :: SUCCESSFULLY ADDED NODE TO STORE"));
      console.log(newNode);

    } catch (exception){
      console.log(chalk.red("DNS :: FAILED TO ADD NODE"));
    }
  }

  socket.write(JSON.stringify(port_Store));

dns.getConnections(function(error,count){
  console.log('Number of concurrent connections to the server : ' + count);
});

socket.setEncoding('utf8');

socket.setTimeout(800000,function(){
  // called after timeout -> same as socket.on('timeout')
  // it just tells that soket timed out => its ur job to end or destroy the socket.
  // socket.end() vs socket.destroy() => end allows us to send final data and allows some i/o activity to finish before destroying the socket
  // whereas destroy kills the socket immediately irrespective of whether any i/o operation is goin on or not...force destry takes place
  console.log('Socket timed out');
  socket.end()
});

socket.on('data',function(transaction){
  var bread = socket.bytesRead;
  var bwrite = socket.bytesWritten;
  console.log('Bytes read : ' + bread);
  console.log('Bytes written : ' + bwrite);
  console.log('Data sent to server : ' + transaction);

    //echo data
    var is_kernel_buffer_full=true ;//= socket.write('Node : ' + server.address().port + ' successfully added Block :: ' + JSON.stringify(blockChain, null, 4));
    if(is_kernel_buffer_full){
      console.log('Data was flushed successfully from kernel buffer i.e written successfully!');
      flag = false;
    }else{
      socket.pause();
    }
});

socket.on('rand',function(data){
  console.log("new data: " + data)
});

socket.on('drain',function(){
  console.log('write buffer is empty now .. u can resume the writable stream');
  socket.resume();
});

socket.on('error',function(error){
  console.log('Error : ' + error);
});

socket.on('timeout',function(){
  console.log('Socket timed out !');
  socket.end('Timed out!');
  // can call socket.destroy() here too.
});

socket.on('end',function(data){
  console.log('Socket ended from other end!');
  console.log('End data : ' + data);
});

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

setTimeout(function(){
  var isdestroyed = socket.destroyed;
  console.log('Socket destroyed:' + isdestroyed);
  socket.destroy();
},1200000);

});

//emits when server is bound with server.listen
dns.on('listening',function(){
  console.log('DNS Port :: ' + dns.address().port);
});

dns.maxConnections = 10;

//static port allocation
dns.listen(1234);

//****************************************************
//END DNS SERVER
//****************************************************
