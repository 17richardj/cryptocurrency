//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file thread.js
//@descr compartmentalized ejs objects to be served to views. Improves readability and makes it easier to make changes across the site.
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************


let blChain = require('../../models/Blockchain')
let blck = require('../../models/Block')

var blockChain = new blChain;

//import worker thread module
const { Worker, isMainThread, parentPort } = require("worker_threads");

//if this is main thread theres a problem
if (isMainThread) {

} else {
  //asyncronous function to listen to events from main thread
  (async () => {
    // listen for message and do things according to passed value
    parentPort.on("message", (value) => {
      // worker threads do not have multiple listeners available for passing different event,
      // therefore add one onMessage listener, and pass an object with commands/data from main thread

      //if main thread sends exit close log and close process
        if(value.exit){

          console.log("doing cleanup");
          process.exit(0);

        }else{

          //data shared in the array buffer contains null memory elements
          //this must be trimmed before the data can be handleds
          //gather the index of the first null element and trim the rest off
          var null_Index = value.shared_Chain.indexOf(0);

          if(null_Index != -1){
            //temporary new int232 array to hold value of sliced shared array
            var temp = new Int32Array();

            temp = value.shared_Chain.slice(0, null_Index);

            //convert temporary array int Uint8Array so it can be decoded into readable text
            var block_chain = new Uint8Array(temp);

            /**
            while(temp[index] != 0){
              block_chain[index] = temp[index];
              index++;
            }
            **/

            //to retrieve values use text decoder to return to normal string types
            var decoder = new TextDecoder("utf-8");
            block_chain = decoder.decode(block_chain);

            //grab transaction pool from message header
            var transaction_Pool = value.pool;

            //attempt to mine new block with current transaction pool. if successful continue on...
            if(blockChain.addNewBlock(new blck(value.index, { transaction_Pool }))){
              console.log("Added new block to chain");

              try{
                //parse readable json string into object
                block_chain = JSON.parse(block_chain);

                //grab the current block from the chain
                var block = blockChain.blockchain[1];

                //push the block to the previous chain
                block_chain.blockchain.push(block);
                //then stringify the entire chain so it can be sent back to the server
                block_chain = JSON.stringify(block_chain);

                //encode utf-8 to Uint8Array
                var encoder = new TextEncoder(); // always utf-8

                //encode the block to Uint8Array
                block_chain= encoder.encode(block_chain);

                //convert to uint32 array type
                block_chain = new Int32Array(block_chain);

                //add the temporary int32 array instance to the shared parent thread memory array
                for(var i = 0; i < block_chain.length; i++){
                  value.shared_Chain[i] = block_chain[i];
                }
                //console.log(value.shared_Chain);
                parentPort.postMessage("Success");

            }catch (e){

              console.log("THREAD :: ERROR" + e);

            }
            }

        }else{
          console.log("Thread ran out of memory");
        }
        }
    });
    // add other logic for receiving messages from main thread

    console.log("I am the worker");

    // This thread will spawn its own dependencies, so I want to listen here the terminate signal from
    // mainThread to close the dependencies of this worker
    // Sth like the following will be awesome
    // thread.on('exit', () => { /* close dependencies */ })

    // Simulate a task which takes a larger time than MainThread wants to wait
    //await new Promise((resolve) => {
      //setTimeout(resolve, 10000);
  //  });
  })();
}




//if(blockChain.addNewBlock(new blck(index++, { transaction_Pool }))){
  //console.log(chalk.green("Added new block to chain"));
  //newUser.coin += blockChain.blockchain[i].coin.amount;
  //blockChain.blockchain[i].coin.amount = 0;
//}
