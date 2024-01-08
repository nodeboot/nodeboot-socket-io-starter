const ObjectHelper = require('nodeboot-common').ObjectHelper;
const MetaHelper = require('nodeboot-common').MetaHelper;

function SocketIoStarter() {

  this.autoConfigure = async (dependencies) => {
    console.log("nodeboot-socket-io-starter was detected. Configuring...");
    var socketioSettings = {};
    if (!ObjectHelper.hasProperty(global.NodebootContext, "instancedDependecies.configuration.nodeboot.socket-io.settings")) {
      console.log("nodeboot.socket-io.settings was not found in application.json. Socket.io starter will configured with default values.");
    } else{
      socketioSettings = global.NodebootContext.instancedDependecies.configuration.nodeboot.socketio;
    }
    
    if (!ObjectHelper.hasProperty(global.NodebootContext, "instancedDependecies.expressLiveServer")) {
      console.log("express live server reference is required to configure the socket.io starter");
      return;
    }

    const expressLiveServer = global.NodebootContext.instancedDependecies.expressLiveServer;
    
    const io = require('socket.io')(expressLiveServer, socketioSettings)

    //search the sockets controllers
    var functions = MetaHelper.getFunctionsOfModulesAnnotatedWith(dependencies, "SocketIoController", "SocketIoEvent");
    
    io.on('connection', function (socket) {
      console.log("headers at connection:")
      console.log(socket.handshake.headers)

      for(var functionsInfo of functions){
        //get module instance
        let instanceId = functionsInfo.instanceId;
        if(typeof instanceId === 'undefined') continue;

        var module = global.NodebootContext.instancedDependecies[instanceId]

        if(typeof module === 'undefined') continue;

        if(typeof functionsInfo.functionName === 'undefined') continue;

        if(typeof functionsInfo.arguments === 'undefined' || typeof functionsInfo.arguments.eventName === 'undefined') {
          console.log("@SocketIoEvent require eventName attribute in function: "+functionsInfo.functionName)
          continue;
        }

        var functionInstance = module[functionsInfo.functionName];
        if(typeof functionInstance === 'undefined') continue;

        socket.on(functionsInfo.arguments.eventName, function (data) {
          functionInstance(data, socket, io.sockets);
        });
      }
    }); 
  }
}

module.exports = SocketIoStarter;