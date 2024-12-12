/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


/******************************
 * Some Variables you might want to change
 */




class Owlidays2024 {

    constructor(options){
        // midifile: the midi file to play. 
        // Choose one of the files in the web/midi directory, or add your own.
        //let midifile = "12Days.mid"; // too christmassy?
        //let midifile = "dingdong.mid"; // this one is good.
        // GrandmaGotRanOverByAReindeer // good!
        //let midifile = "holidaymedley.mid"; // nope
        // Pogues_Fairy_Tale_In_New_York_City.mid//let midifile = "mfrosty.mid"; // this one is good.
        //let midifile = "Happy-Birthday.mid"; // short, for testing        
        this.midifile = options.Arraymidifile ? options.midifile : "Pogues_Fairy_Tale_In_New_York_City.mid";  // best one
        this.mididir = options.mididir ? options.mididir : __dirname+"/../web/midi";

        this.WEBSOCKET_PORT = options.WEBSOCKET_PORT ? options.WEBSOCKET_PORT : 8098;
        this.WEBSERVER_PORT = options.WEBSERVER_PORT ? options.WEBSERVER_PORT : 3003;
        this.UDPLISTENPORT = options.UDPLISTENPORT ? options.UDPLISTENPORT : 8089;
        this.initVariables();
        this.initClasses();
        this.setupSocketMessages();
        this.start();
    }

    start(){
        this.socket.startSocketServer();
        this.socket.startWebServer();
    }

    initVariables(){

        this.default_webpage = "index.html";
        this.WEBSERVER_ROOT = __dirname+"/../web";

        this.playing = false;
        this.scorestarttime = 0;
    }

    initClasses(){
        // socketServer is the web page that gets control messages
        const SocketServer = require("./socketserver.js");
        const MidiParser = require("./midiparser.js");
        const Choir = require("./choir.js");

        // TURN DEBUGGING ON/OFF HERE
        const Debugging = require('./debugging.js');
        this.db = new Debugging();
        this.db.active = true;
        this.db.trace = false;
        this.db.log("starting","now",[1,2,3]);


        // parsing the midi file, to figure out the number of channels.
        this.parser = new MidiParser();
        this.parser.db = this.db;
        this.parser.midiFile = this.mididir + "/"+ this.midifile; 
        this.parser.startTime = (new Date()).getTime() + 10000 ; // add 10 seconds
        this.parser.parseMidiFile();
        console.log("all midi file channels used ", this.parser.channels, this.parser.numChannels);


        // the choir manager the voices that get distributed to all connected devices
        this.choir = new Choir();
        console.log("parser channels",Object.keys(this.parser.channels) )
        this.choir.init();
        this.choir.allChannels = Object.keys(this.parser.channels);

        // SocketServer handles websocket and http communication with the web client.
        this.socket = new SocketServer();
        this.socket.WEBSOCKET_PORT = this.WEBSOCKET_PORT;
        this.socket.WEBSERVER_PORT = this.WEBSERVER_PORT;
        this.socket.default_webpage = this.default_webpage;
        this.socket.webdir = this.WEBSERVER_ROOT;
        this.socket.db = this.db;
    }

    setupSocketMessages(){
        let self = this;
        this.socket.setMessageReceivedCallback(function(msg, ip){

            console.log("messageReceived", msg, ip);
    
            // this message comes from the client to sync its clock
            // with the server and with other devices, so the song 
            // is played at the same time on each device,
            // and devices can enter during the song and start in the right place.
            self.routeFromWebsocket(msg, ip, "gettime", function(msg){
                console.log("gettime", msg);
                let clientnow = msg.clienttime;
                let now = Date.now();
                console.log(now, clientnow, now-clientnow);
                let data = {
                    servernow: now,
                    clientnow: clientnow,
        //            difference: now - clientnow
                    difference: clientnow - now
                }
                self.socket.sendMessage("servertime", data, ip);    
            });
    
            // this happens when the client user presses the "start" button
            // the client sends its "current time", so the server can tell the 
            // client to start playing some seconds in the future
            // this accounts for lag between the client and server, 
            // and allows for multiple devices to start playing at the same time. 
            self.routeFromWebsocket(msg, ip, "memberstart", function(msg, ip){
                console.log("memberstart", msg);
                console.log("adding member", msg, ip);
                self.choir.addMember(msg.uniqID, ip);
                self.choir.distributeChannels();
                self.sendUpdatedChannels( );
                console.log("added member", self.choir);
    
                if(self.scorestarttime == 0){
                    let clienttime = msg.clienttime;
                    self.scorestarttime = clienttime + 5000; // wait 5 seconds;
                }
                let data ={starttime: self.scorestarttime, uniqID : msg.uniqID, midifile: self.midifile};
                self.socket.sendMessage("startplaying", data, ip);
            });
    
            // this is the client letting us know that the song is currently playing
            self.routeFromWebsocket(msg,  ip, "startscore", function(msg){    
                if(self.playing){
                    return;
                } 
                self.playing = true;
            });
    
            // the server gets this message when the song is over, 
            // so the server knows that the next time it gets a
            //  memberstart message it is starting the song at the beginning again
            self.routeFromWebsocket(msg, ip, "songover", function(msg){
                self.songOver();
            });
        });
    
    
        // when a client disconnects,
        // redistribute the channels to all connected devices
        this.socket.setDisconnectCallback(function(ip){
            self.choir.removeMember(ip);
            if(self.choir.hasMembers()){
                self.choir.distributeChannels();
                self.sendUpdatedChannels(self.choir);
            }else{
                self.songOver();
            }
        });
    }


    // called by "songover" websocket message.
    songOver(){
        console.log("song over");
        this.playing = false;
        this.scorestarttime = 0;
    }


    // send updated channel information to all connected devices
    sendUpdatedChannels(){
        let self = this;    
        this.choir.allMembersCallback(function(key, member){
            let data = {uniqID: key, channelList : member.channels, allChannels: self.choir.allChannels};
            console.log("sending channels to member", data, member);
            self.socket.sendMessage("yourchannels", data, member.ip);
        });
    }


    // some websocket messages come in with a word preceding them, 
    // which helps determine what they mean and where they should go.
    // pass to Route to send to a specific callback.
    // return true if the route was a match, false otherwise.
    routeFromWebsocket(msg, ip, route, callback){
        console.log("routeFromWebsocket", msg);
        let channel = false;
        let newmsg = false;
        if(msg.address){
            channel = msg.address; 
            newmsg = msg.data;       
        }else{
            let split = msg.split(/ /);
            channel = split.shift();
            newmsg = split.join(" ");
        }
        if(channel.toLowerCase() == route.toLowerCase()){
            callback(newmsg, ip);
            return true;
        }
        return false;
    }


    /////////////////////////////////////////
    // routing function for handling all OSC messages
    // oasMsg : osc message, with .address and .args address provided
    // route : string or regex to match the address
    // args: the message content
    // callback function(oscMsg, routematches)
    // -- the orginal OSCMsg, with propery simpleValue added, 
    //    which is the best we could do to get the sent message value as a simple value or JSON array
    // -- the address split into an arrqy on /
    routeFromOSC(oscMsg, route, callback){

         // get teh OSC value. Need to figure out types here, 
        let value = oscMsg.args;
        let newvalue = false;
/*
        this.db.log("got oscMsg " + value, value);
        this.db.log(oscMsg);
            this.db.log(typeof value);
    */
        if(typeof value == "number"){
            newvalue = value;
        }else if(Array.isArray(value) && value.length == 1 && Object.hasOwn(value[0], "value")){
            if(value[0].type == "s"){
                try{
                    newvalue = JSON.parse(value[0].value);
                }catch(e){
                    newvalue = value[0].value;
                }
            }else{
                newvalue = value[0].value;
            }
        }else if(Array.isArray(value) && value.length > 1 && Object.hasOwn(value[0], "value")){
            newvalue = [];
            for(let i = 0; i < value.length; i++){
                if(value[0].type == "s"){
                    try{
                        newvalue[i] = JSON.parse(value[i].value);
                    }catch(e){
                        newvalue[i] = value[i].value;
                    }
                }else{
                    newvalue[i] = value[i].value;
                }
            }
        }else{
            db.log("!!!!!!!!!!!!!! ");
            db.log("don't know what value is " + Array.isArray(value) + " : " + value.length + " type :" + typeof value);
        }

        oscMsg.simpleValue = newvalue;

        let matches = oscMsg.address.match(route);
        if(matches){
            let split = oscMsg.address.split("/");
            callback(oscMsg, split);
        }
    }
}

module.exports = Owlidays2024;