const ObjectHelper = require('nodeboot-common').ObjectHelper;
const MetaHelper = require('nodeboot-common').MetaHelper;

function SocketIoStarter() {

  this.autoConfigure = async (dependencies) => {
    console.log("nodeboot-socket-io-starter was detected. Configuring...");
    var socketioSettings = {};
    if (!ObjectHelper.hasProperty(global.NodebootContext, "instancedDependecies.configuration.nodeboot.socket-io.settings")) {
      console.log("nodeboot.socket-io.settings was not found in application.json. Socket.io starter will configured with default values.");
    } else{
      socketioSettings = global.NodebootContext.instancedDependecies.configuration.nodeboot["socket-io"].settings;
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

      //due to this https://stackoverflow.com/q/77769886/3957754
      //we cannot bind the listener before the connection. I mean at the startup
      //there is no way to bind two connections
      console.log("nodeboot-socket-io-starter was detected. Configured");
      socket.onAny((eventName, data) => {

        console.log("received event: "+eventName)
        let notFound = 0;
        for(var functionsInfo of functions){
          //get module instance
          let instanceId = functionsInfo.instanceId;
          if(typeof instanceId === 'undefined') continue;
  
          var module = global.NodebootContext.instancedDependecies[instanceId]
  
          var errorFunctionInstance = getErrorFunctionInstance(dependencies, module);
  
          if(typeof module === 'undefined') continue;
  
          if(typeof functionsInfo.functionName === 'undefined') continue;
  
          if(typeof functionsInfo.arguments === 'undefined' || typeof functionsInfo.arguments.eventName === 'undefined') {
            console.log("@SocketIoEvent require eventName attribute in function: "+functionsInfo.functionName)
            continue;
          }

          if(functionsInfo.arguments.eventName == eventName){
            var functionInstance = module[functionsInfo.functionName];
            if(typeof functionInstance === 'undefined') continue;
            console.log(`executing module: ${instanceId} function: ${functionsInfo.functionName}`)
  
            return functionInstance(data, socket, io).catch(function(err){
              //apply the global error handler
              if(typeof errorFunctionInstance !== 'undefined') {
                return errorFunctionInstance(err, socket, io);
              }else{
                throw err;
              }            
            }); 
          }else{
            notFound++;
          }
        }
        
        if(notFound===functions.length){
          console.log("event from client don't have a listener in the server: "+eventName)
        }
      });
    }); 
  }

  function getErrorFunctionInstance(dependencies, module){
    var errorHandler = MetaHelper.getFunctionsOfModulesAnnotatedWith(dependencies, "SocketIoController", "SocketIoErrorHandler");
    //TODO: validate only one error handler
    if(errorHandler.length === 0) return;

    var functionName = errorHandler[0].functionName

    if(typeof functionName === 'undefined') return;

    return  module[functionName];
  }
}

module.exports = SocketIoStarter;