// comments here
const path = require('path');
var connect = require('connect');
var serveStatic = require('serve-static');
let my_ip_address= "localhost";
// figuring out IP address:
const { networkInterfaces } = require('os');
const WebSocket = require('ws'); //https://www.npmjs.com/package/ws#sending-and-receiving-text-data


let globalvar = "goo";

let SocketServer = {

  WEBSOCKET_PORT : 8001,
  WEBSERVER_PORT : 8002,
  default_webpage : "index.html",
  webdir : "./",

  socketserver : false,
  sockets : [],

  messageReceivedCallback : false,

  startSocketServer(){

    this.db.log("trying to start websockets...");

    this.socketserver = new WebSocket.Server({

      port: this.WEBSOCKET_PORT
    });
    
    let self = this;

    this.socketserver.on('connection', (function(socket, req) {
      console.log("socket connected");
      const ip = req.socket.remoteAddress;
      socket.ip = ip;

      console.log(ip);
      this.sockets.push(socket);
      this.db.log("STARTD websockets " +globalvar);
//      this.db.log(this.socketserver);

      // When you receive a message, send that message to every socket.
      socket.on('message', (function(msg, req) {
        this.db.log("got message ", socket.ip);
        //this is messages FROM the web page
        this.db.log(msg.toString());
        let newmsg = JSON.parse(msg.toString());          
        this.db.log(newmsg);
        this.messageReceived(newmsg, socket.ip);
      }).bind(this));

      // When a socket closes, or disconnects, remove it from the array.
      socket.on('close', (function() {
        console.log("socket disconnected", socket.ip);
        this.socketDisconnected(socket.ip);
        this.sockets = this.sockets.filter(s => s !== socket);
      }).bind(this));

    }).bind(this));

  },

  socketDisconnected(ip){
    if(this.disconnectCallback){
      this.disconnectCallback(ip);
    }
  },

  setDisconnectCallback(callback){
    this.disconnectCallback = callback;
  },

  messageReceived(msg, ip){
    if(this.messageReceivedCallback){
      this.messageReceivedCallback(msg, ip);
    }
  },

  setMessageReceivedCallback(callback){
    this.messageReceivedCallback = callback;
  },


  sendMessage(address, data,ip){
    let msg = {
      address: address,
      data : data
    }
    if(ip){
      this.sockets.forEach(s=>{
        if(s.ip == ip){
          s.send(JSON.stringify(msg));
        }
      })
    }else{
      this.sockets.forEach(s => s.send(JSON.stringify(msg)));
    }
  },

  startWebServer(){
    // this is serving the web page
    this.db.log("startWebServer");
    this.db.log(this.webdir);    
    self = this;
    let options = {index: this.default_webpage};
    this.db.log(options);
    connect()
      .use(serveStatic(this.webdir,options))
      .listen(this.WEBSERVER_PORT, () => 	{

        const nets = networkInterfaces();
        const results = Object.create(null); // Or just '{}', an empty object
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                this.db.log(name);
                results[name].push(net.address);
            }
          }
        }
        this.db.log("started webserver?");
        this.db.log(results);
        if(results["en0"]){
          my_ip_address = results["en0"]; 
        }else if(results["Ethernet"]){
          my_ip_address = results["Ethernet 2"]; 
        }
        this.db.log('http://'+my_ip_address+':'+self.WEBSERVER_PORT+'/index.html');
        this.db.log('ipaddress '+my_ip_address);
      });
    }
  }


exports.SocketServer = SocketServer;
