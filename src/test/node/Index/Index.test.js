const _ = process.cwd();
const fs = require('fs');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const fp = require("find-free-port")
const express = require('express');
var io = require('socket.io-client');

const SocketIoStarter = require(`${_}/src/main/node/Index.js`);

describe('SocketIoStarter: autoConfigure', function() {
  it('should return null if expressLiveServer is null', async function() {
    var socketIoStarter = new SocketIoStarter();
    var result = await socketIoStarter.autoConfigure();
    expect(undefined).to.equal(result);
  });

  it('should bind the events', async function() {

    var rawMeta = await fs.promises.readFile(path.join(__dirname, "meta.json"), "utf-8");
    var dependencies = JSON.parse(rawMeta);

    const app = express()
    var freePort = await fp(3000);
    var port = freePort[0];
    const server = app.listen(port);    
  
    global["NodebootContext"] = {}
    global["NodebootContext"]["instancedDependecies"] = {}
    global["NodebootContext"]["instancedDependecies"]["expressLiveServer"] = server;

    global["NodebootContext"]["instancedDependecies"]["battleRoute"] = new function(){
      this.newMessageFunction = (data, currentSocket, globalSocket) =>{
        console.log(`socket id: ${currentSocket.id}`)
        console.log("headers on event:")
        console.log(currentSocket.handshake.headers)
        console.log("number: " + data.number)
        globalSocket.emit('output', {result: data.number*2});
      }
    };

    var socketIoStarter = new SocketIoStarter();
    var result = await socketIoStarter.autoConfigure(dependencies);

    var socket = io.connect(`http://localhost:${port}`, {reconnect: true});
    var resultWasReceived = false;
    var socketResponse;
    // Add a connect listener
    socket.on('connect', function (socket) {
        console.log('Connected!');      
    });

    socket.emit('new-message', {"number": 10});    

    socket.on('output', (data) => {
      console.log("received event data from the socket io server");
      console.log(data)
      resultWasReceived = true;
      socketResponse = data;
    });      

    while(resultWasReceived===false){
      await new Promise(r => setTimeout(r, 1000));
    }

    expect(socketResponse.result).to.equal(20);
  })  
});
