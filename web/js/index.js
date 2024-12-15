/**
 * Some Variables you might want to change
 */

/**
 * Icons for the dynambs.
 *  As new dynambs are added, you can add new emojie for them here
 */
let dynambicons = {
    acceleration: "🚀",
    isLiquidDetected: "💧",
    temperature: "🌡️",
    relativeHumidity: "💦",
    illuminance: "☀️",
    isMotionDetected: "🏃🏻‍♀️",
    numberOfOccupants:"👪🏽",
    batteryPercentage: "🔋"
};

/**
 * Icons for the singers.
 * We are using images of Pareto Anywhere mascots for the singers,
 *  but you can change them to anything you want. 
 *  Just make sure that the images are in the images/ directory, 
 *  and that you have a pair of images each singer, one open mouth, one closed mouth.
 *  The open mouth image is first in the array.
 */
var singerimages = [
    // open-mouth image first.
    ["images/advlib-mouth-open.png","images/advlib-mouth-closed.png"],
    ["images/barnacles-mouth-open.png","images/barnacles-mouth-closed.png"],
    ["images/barnowl-mouth-open.png","images/barnowl-mouth-closed.png"],
    ["images/barterer-mouth-open.png","images/barterer-mouth-closed.png"],
    ["images/beaver-mouth-open.png","images/beaver-mouth-closed.png"],
    ["images/charlotte-mouth-open.png","images/charlotte-mouth-closed.png"],
    ["images/chickadee-mouth-open.png","images/chickadee-mouth-closed.png"],
    ["images/chimps-mouth-open.png","images/chimps-mouth-closed.png"],
    ["images/cormorant-mouth-open.png","images/cormorant-mouth-closed.png"],
    ["images/cuttlefish-mouth-open.png","images/cuttlefish-mouth-closed.png"],
    ["images/json-silo-mouth-open.png","images/json-silo-mouth-closed.png"],
    ["images/starling-mouth-open.png","images/starling-mouth-closed.png"],
]


let db_active = true;

function dblog(text){
    if(db_active){
        console.log(...arguments);
    }
}

/*
* everything below here you probably don't need to change.
*/

let HOST =  window.location.host;
dblog(HOST);
HOST = HOST.replace(/:[0-9]+/,"");
// remove port
dblog(HOST);

let DEFAULT_WEBSOCKET_PORT= 8098;
let DEFAULT_WEBSERVER_PORT = 3003;
let DEFAULT_BEAVER_URL = HOST;
let DEFAULT_BEAVER_PORT = 3001;

let WEBSOCKET_PORT= DEFAULT_WEBSOCKET_PORT;
let WEBSERVER_PORT = DEFAULT_WEBSERVER_PORT;
let BEAVER_URL = DEFAULT_BEAVER_URL;
let BEAVER_PORT = DEFAULT_BEAVER_PORT;

// sometimes I uncomment this to force a change to the localStorage variable.
//localStorage.setItem("BEAVER_URL",BEAVER_URL);


// midifile here is default- server will tell client which one to play when it sends "startplaying" message
let mididir = "midi";
let midifile = "holidaymedley.mid"; // nope

var player;  // the midi player
var playing = false; // tracks is the song is playing
let started = false; // set to true once "Play" is pressed. Back to false once the song is over.
 
let tinysynth = false; //JZZ().openMidiOut('Web Audio'); // the synth that generates the tones

let timeskew = 0;

let firstnoteplayed = false; // tracks if the first note has been played

let uniqID = Math.random() * 10000 * Date.now();  // a unique ID for this client.

let myChannels = []; // array of channel numbers that I'm playing. The others get turned down.
let prevMyChannels = [] // so we can delete channels that were just removed.
let allChannels = []; // array of all channel numbers

let exludevoices = []; // list of synth voices that are excluded from the choir, because they are annoying.


// websocket stuff
let ws = false;
let wsready = false;  


/***
 * Setting up the graphics, screen layout, etc.
 * It's a mibt of convoluted code 
 * to figure out where to place the singers on the screen, 
 * so it looks good as singers are added and removed.
 */
var singerOrigWidth = 160;
var singerOrigHeight = 160;

/*
var screenwidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
var screenheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
*/
var footerheight = document.getElementById("footer").clientHeight;
var screenwidth = document.getElementById("owlidaycontent").clientWidth;
var screenheight = document.getElementById("owlidaycontent").clientHeight - footerheight;

dblog("footerheight", footerheight);
dblog("screenwidth", screenwidth);
dblog("screenheight", screenheight);

var singerWidth = Math.floor(screenwidth / 6);
var singerRatio = singerWidth / singerOrigWidth;
var singerHeight =  singerOrigHeight * singerRatio;

if(screenwidth > screenheight){
    singerHeight = Math.floor(screenheight / 6);
    singerRatio = singerHeight / singerOrigHeight;
    singerWidth =  singerOrigWidth * singerRatio;
}

var singerSafeScreenWidth = screenwidth - singerWidth;
var singerSafeScreenHeight = screenheight - singerHeight;

// whether or not the config div is showing
let showing_config_div = false;

// whether or not the beaver connection is ok
let beaver_connection_ok = false;


document.addEventListener('DOMContentLoaded', function() {
    dblog("starting");

    /*
    screenwidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    screenheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
*/
    setup_config_vars();
    setup_beaver();
    setup_websockets();

    // some debugging code to show the current time. Commented out for now.
    /*
    setInterval(function(){
        document.querySelectorAll('.time2').forEach(elem => {
            elem.textContent = correctedNow();
        });
    }, 100);
    */
    
    /**
     * set timing for updating the dynambs to the grpahics display
     */
    setInterval(updateDynambs, 2000);

    /**
     * setup interaction buttons
     */

    // play button - sends the request to the server, 
    // which returns with a starttime for the song.
    // the client then starts playing the song at that time.
    document.querySelectorAll('.play').forEach(elem => {
        elem.addEventListener('click', function() {
            dblog("starting");
            if(started){
                // shuffle the instrument choices.
                setupChannelPrograms();
                return;
            }
            started = true;

            let now = correctedNow();
            let data = {clienttime: now, uniqID: uniqID};
            message("memberstart", data);
            
            JZZ.synth.Tiny.register('Web Audio');
            tinysynth = JZZ().openMidiOut('Web Audio');
        });
    });

    // config button - shows the config div, 
    // which allows you to change the Pareto Anywhere Beaver server address and port.
    // this only appears if the beaver connection is not ok.
    document.querySelectorAll('.configbutton').forEach(elem => {
        elem.addEventListener('click', function() {
            document.querySelectorAll('.configbuttondiv').forEach(elem => {
                elem.style.display = 'none';
            });
            document.querySelectorAll('.configdiv').forEach(elem => {
                elem.style.display = 'block';
            });
            showing_config_div = true;            
        });
    });

    // save button - saves the config vars to localStorage, 
    // and reloads the page, so Beaver starts a fresh connection
    document.querySelectorAll('.savebutton').forEach(elem => {
        elem.addEventListener('click', function() {
            update_config_vars();
            document.querySelectorAll('.configbuttondiv').forEach(elem => {
                elem.style.display = 'block';
            });
            document.querySelectorAll('.configdiv').forEach(elem => {
                elem.style.display = 'none';
            });
            showing_config_div = false;            
        });
    });

    // restore button - restores the default config vars
    // in the config div form
    document.querySelectorAll('.restorebutton').forEach(elem => {
        elem.addEventListener('click', function() {
            restore_default_vars();
        });
    });


});



/**
 * SETUP Websockets message handling
 */

function setup_websockets(){

    ws = new WebSocket('ws://'+HOST+':'+WEBSOCKET_PORT);

    // Browser WebSockets have slightly different syntax than `ws`.
    // Instead of EventEmitter syntax `on('open')`, you assign a callback
    // to the `onopen` property.
    ws.onopen = function() {
        wsready = true;
        dblog("opened " + ws.readyState);
        //   message("ready", data);
        timecheck();
    };

    ws.onerror = function(msg){
        dblog("ws error");
        dblog(msg);
    }

    ws.onclose = function(msg){
        dblog("wsclose");
        dblog(msg);
    }

    // handle messages from the server
    ws.onmessage = function(event) {
    //    dblog("got message ", event);
        msg = JSON.parse(event.data);

        // this messaage isn't used.
        if(msg.address == "playnote"){
            midiMakeNote(msg.data.pitch, msg.data.velocity, msg.data.duration)
        }

        // this message is used to sync the client and server time
        if(msg.address == "servertime"){
            processServerTime(msg);
        }

        // this message is used to start the song and the specified time in the future
        if(msg.address == "startplaying"){
            dblog("startingplaing", msg);
            midifile= msg.data.midifile;
            startGraphics();
            startMidiFile(msg.data.starttime);
        }

        // this message is used to get the list of channels for this player
        // the play then adjusts the tones and volumes for the channels
        // and rearranges the singers on the screen
        // to match the channels.

        if(msg.address == "yourchannels"){
            // getting the list of channels for this player
            dblog("yourchannels", msg);
            updateChannels(msg.data.channelList, msg.data.allChannels);
        }
    }
}


/**
 * Setting up the config vars from localStorage, or default values
 */
function setup_config_vars(){
    BEAVER_URL = localStorage.BEAVER_URL ? localStorage.BEAVER_URL : DEFAULT_BEAVER_URL;
    BEAVER_PORT = localStorage.BEAVER_PORT ? localStorage.BEAVER_PORT : DEFAULT_BEAVER_PORT;

    document.querySelector('#paretoip').value = BEAVER_URL;
    document.querySelector('#paretoport').value = BEAVER_PORT;

}

/**
 * Updating the config vars from the config div form
 */
function update_config_vars(){
    const paretoIpElement = document.querySelector('#paretoip');
    const paretoPortElement = document.querySelector('#paretoport');
    if (paretoIpElement) BEAVER_URL = paretoIpElement.value;
    if (paretoPortElement) BEAVER_PORT = paretoPortElement.value;
    localStorage.setItem("BEAVER_URL",BEAVER_URL);
    localStorage.setItem("BEAVER_PORT",BEAVER_PORT);

    // reload the page, so Beaver starts a fresh connection
    location.reload();

    //    setup_beaver();
}

/**
 * Restoring the default config vars into the config div form
 */
function restore_default_vars(){
    BEAVER_URL = DEFAULT_BEAVER_URL;
    BEAVER_PORT = DEFAULT_BEAVER_PORT;
    const paretoIpElement = document.querySelector('#paretoip');
    const paretoPortElement = document.querySelector('#paretoport');
    if (paretoIpElement) paretoIpElement.value = BEAVER_URL;
    if (paretoPortElement) paretoPortElement.value = BEAVER_PORT;
}


/*********************
 * Managing data about raddecs and dynambs
 */
let raddecElems = {};

/**
 * setup all the beaver events we want to listen for
 */
function setup_beaver(){
    // https://github.com/reelyactive/beaver
    dblog("starting beaver "+ BEAVER_URL);

    beaver.stream("http://"+BEAVER_URL+":"+BEAVER_PORT, {io: io});

    // raddecs make stars!
    beaver.on("raddec", function(raddec){
//        dblog("beaver raddec", raddec);
        updateBeaverRaddec(raddec);
    });
    
    // dynambs are icons that float around the singers
    beaver.on("dynamb", function(dynamb){
//        dblog("beaver dynamb", dynamb);
        updateBeaverDynamb(dynamb);
    });

    // appearance of a device. Currently not used.
    beaver.on("appearance", function(deviceSignature, device){
  //      dblog("beaver appearance", deviceSignature, device);
    });

    // disappearance of a device. triggers the dissappearance of a star.
    beaver.on("disappearance", function(deviceSignature){
//        dblog("beaver disappearance", deviceSignature);
        removeBeaverDevice(deviceSignature);
    });
    beaver.on("error", function(e){
        dblog("beaver error", e.name);
        dblog(e.message);
        dblog(BEAVER_URL);
        if(e.message.match("Failed to GET") || e.message.match("Socket.IO connect error on")){
            dblog("beaver not found");
            beaver_connection_ok = false;
            if(!showing_config_div){
                document.querySelectorAll('.configbuttondiv').forEach(elem => {
                    elem.style.display = 'block';
                });
            }             
        }        
    })
    beaver.on("connect",function(e){
        dblog("beaver connect  "+ BEAVER_URL);
        document.querySelectorAll('.configbuttondiv').forEach(elem => {
            elem.style.display = 'none';
        });        
        beaver_connection_ok = true;        

    });
    beaver.on("disconnect",function(e){
        dblog("beaver disconnect  "+ BEAVER_URL);
    });
}


/**
 * update list of raddecs
 * @param {*} raddecs 
 * each raddec is a star, rancomly placed.
 * Its twinkle speed is determined by the rssiSignature[0].rssi
 */
function updateBeaverRaddec(raddec){
    let star = false;
    if(!raddecElems[raddec.transmitterId]){
        star = document.createElement("p");
        star.innerText = "⭐";
        star.style.position = "absolute";
        star.style.top = Math.floor(Math.random() * screenheight)+"px";
        star.style.left = Math.floor(Math.random() * screenwidth) - 10+"px";
        document.getElementById("owlidaycontent").appendChild(star);
        raddecElems[raddec.transmitterId] = star;
    }else{
        star = raddecElems[raddec.transmitterId];
    }
    let scaledTiming = dynScale(raddec.rssiSignature[0].rssi, .5, 5);
    star.style.animation =  "customAni "+scaledTiming+"s ease 0s infinite normal none";
}

/**
 * remove a star from the screen
 * @param {*} deviceSignature 
 */
function removeBeaverDevice(deviceSignature){
//    dblog("removing ", deviceSignature);
    if(raddecElems[deviceSignature]){
        raddecElems[deviceSignature].remove();
        delete raddecElems[deviceSignature];
    }
}


/**
 * update the list of dynambs
 * @param {*} dynamb 
 */
let allDynambDevices = {};
function updateBeaverDynamb(dynamb){
    allDynambDevices[dynamb.deviceId] = dynamb;
}


/**
* put dynamb data into something a bit easier to manage
 * @param {*} data 
 * @returns 
 */
function gatherDynambs(){
//    dblog("gatehr" );
    
    // put dynamb data into something a bit easier to manage
    let dynambs = allDynambDevices;
    let dynamblist = [];
    let dynambkeys = Object.keys(dynambs);
    let numdynambkeys = dynambkeys.length;
    let iconKeys = Object.keys(dynambicons);
    for (let i = 0; i<numdynambkeys; i++){
        let dynamb = dynambs[dynambkeys[i]];
        let thisdynambkeys = Object.keys(dynamb);
        thisdynambkeys = thisdynambkeys.filter(d=>iconKeys.includes(d));
        for(let j = 0; j < thisdynambkeys.length; j++){
            dynamblist.push({
                    id: dynamb.deviceId,
                    text: thisdynambkeys[j],
                    icon: dynambicons[thisdynambkeys[j]] });
        }
    }
    return dynamblist;
}

/***
 * update the current list of dynambs, distribute the dynambs to the different channels
 */
function updateDynambs(){
    let dynamblist = gatherDynambs();
  //  dblog(dynamblist);
    let channelkeys = Object.keys(channelVoiceElems);
    let numchannels = channelkeys.length;
    if(numchannels == 0 || dynamblist.length == 0){
        return;
    }
    let di = 0;
    let ci = 0;
    for(let i = 0; i < numchannels; i++){
        let channelelem = channelVoiceElems[channelkeys[i]];
        channelelem[0].dynambs = [];
    }
    while(di < dynamblist.length || ci < numchannels){
        let dynamb = dynamblist[di % dynamblist.length];
        let channelelem = channelVoiceElems[channelkeys[ci % numchannels]];
        channelelem[0].dynambs.push(dynamb);
        di++;
        ci++;
    }
    graphicsPlaceDynambs(dynamblist);
}



/**
 * Updating channels - relates to audio and graphics
 * update the volumes of all channels, to only play the channels that are in myChannels
 * and rearrange the singers on the screen to match the channels.
 */
function updateChannels(_myChannels, _allchannels){
    dblog("updateChannels", _myChannels);
    prevMyChannels = myChannels
    myChannels = _myChannels;
    allChannels = _allchannels;
    if(playing){
        setupChannelVolumes();
    }
    const channelsElement = document.querySelector('.channels');
    if (channelsElement) {
        channelsElement.textContent = JSON.stringify(myChannels, null, "  ");
    }
//    graphicsChannelSetup(myChannels, allChannels);
    placeSingers(myChannels, allChannels);
}


/***
 * Midi/Audio functions
 */

/**
 * Things to do when the first note is played 
 * (ie song has started, or device is joining in a song in progress)
 */
function doAtFirstNote(){
    setupChannelPrograms()
    setupChannelVolumes();
}


/**
 * Whenever there's a midi event (note on, note off, etc)
 * Do what you need to do
 * @param {*} midievent 
 */
function midievent(midievent){
    /*
    // this is a lot of debugging code to see what's going on with the midi event. 
    Commented out for now.
    dblog(midievent,
        midievent.getChannel(), 
        midievent.getNote(),  
        midievent.getVelocity(), 
        midievent.getTempo(), 
        midievent.getBPM(),
        midievent.getSysExId(),
        midievent.getText(),
        midievent.getData(),
        midievent.isProgName(),
        midievent.isFullSysEx(),
        midievent.isMidi(),
        midievent.isNoteOn()
    );
    */

    // midi notes on and off open and close the singers mouths 
    //by switching between the two images. 
    if(midievent.isNoteOn()){
//        dblog("on", midievent.getChannel(), midievent.getNote());
        graphicsNoteOn(midievent.getChannel());
    }
    if(midievent.isNoteOff()){
   //     dblog("off", midievent.getChannel(), midievent.getNote());
        graphicsNoteOff(midievent.getChannel());
    }

    if( !firstnoteplayed && midievent.isNoteOn()){
        firstnoteplayed = true;
        doAtFirstNote();
    }
}



/**
 * Set the tones randomly for each of the voices/channels
 */
function setupChannelPrograms(){
    tinysynth.program(0, getRandomMidiVoice());
    tinysynth.program(1, getRandomMidiVoice());
    tinysynth.program(2, getRandomMidiVoice());
    tinysynth.program(3, getRandomMidiVoice());
    tinysynth.program(4, getRandomMidiVoice());
    tinysynth.program(5, getRandomMidiVoice());
    tinysynth.program(6, getRandomMidiVoice());
}


let assignedVoices = [];
// midi tones between 0 and 115 are all pretty good.
// we don't want to use the same voice for two singers.
function getRandomMidiVoice(){
    let foundone = false;
    let count = 0;
    while(!foundone){
        let voice = Math.floor(Math.random()* 116);
        if(!assignedVoices.includes(voice)){
            assignedVoices.push(voice);
            foundone= true;
            return voice;
        }
        count++;
        if(count > 120){
            return voice;
        }
    }
    
}

/***
 * Setup the channel volume for all channels that this device is supposed to be playing
 */
function setupChannelVolumes(){
    for(var i = 0; i < allChannels.length; i++){
        let channel = allChannels[i];
        if(myChannels.includes(channel)){
            tinysynth.volumeF(channel, 1.0);
        }else{
            tinysynth.volumeF(channel, 0.0);
        }
    }
}


let notecount = 0;
// this isn't used, but could be. let's keep it around.
function midiMakeNote(pitch, velocity, duration){
    if(!started){
        return;
    }
    notecount++;
    const timeElement = document.querySelector('.time');
    if (timeElement) {
        timeElement.textContent = `${notecount} ${pitch} ${velocity} ${duration}`;
    }
    tinysynth.noteOn(0, pitch, velocity)
    setTimeout(function(){
       tinysynth.noteOff(0, pitch);
    }, duration);
}


/**
 * set the midi voice for the specified channel
 * @param {*} channel 
 * @param {*} bank 
 * @param {*} program 
 */
function setMidiVoice(channel, bank, program){
    // assuming default bank.
    tinysynth.program(channel, program);
}

/**
 * load and start the midi file at the specified time
 * @param {*} starttime 
 */
function startMidiFile(starttime){
    let waittime = starttime - Date.now();
    dblog("starting midi file at", starttime, waittime);
    const dbgElement = document.querySelector('.dbg');
    if (dbgElement) {
        dbgElement.textContent = `starting at ${starttime} in ${waittime}`;
    }
    fromURL(starttime);
}


/***
 * Load midi file from URL and pass to the Load function that sets up the midi data to play
 */
function fromURL(starttime) {
    dblog("fromURL");
    clear();
    var url = mididir + "/"+midifile;
    try {
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
          if (this.status == 200) {
            var r, i;
            var data = '';
            r = xhttp.response;
            if (r instanceof ArrayBuffer) {
              r = new Uint8Array(r);
              for (i = 0; i < r.length; i++) data += String.fromCharCode(r[i]);
            }
            else { // for really antique browsers
              r = xhttp.responseText;
              for (i = 0; i < r.length; i++) data += String.fromCharCode(r.charCodeAt(i) & 0xff);
            }
            load(data, url, starttime);
          }
          else {
            log.innerHTML = 'XMLHttpRequest error';
          }
        }
      };
      try { xhttp.responseType = 'arraybuffer'; } catch (e) {}
      xhttp.overrideMimeType('text/plain; charset=x-user-defined');
      xhttp.open('GET', url, true);
      xhttp.send();
    }
    catch (e) {
      log.innerHTML = 'XMLHttpRequest error';
    }
}


/***
 * Load Midi data and setup play time
 * The song might start at a future time,
 * or we might be seeking to a point in the song.
 */
function load(data, name, starttime) {
    dblog("load", name, starttime);
    try {
//        player = JZZ.MIDI.SMF(data).player();
        player = JZZ.MIDI.SMF(data).player();
        player.connect(tinysynth);
        player.connect(function(msg) {
            midievent(msg);
        });      
        player.onEnd = function() {
            dblog("sending song over");
            songOver();
            playing = false;
            started = false;
            message("songover", true);
        }

        let waittime = starttime - correctedNow();
       // waittime = -10000; // testing song end
        if(waittime > 0){
            setTimeout(function(){
                playing = true;
                player.play();        
            }, waittime);
            document.querySelector('.countdown').style.display = "block";
            let interval = setInterval(function(){
                let countdown = Math.floor((starttime - correctedNow())/1000) +1 ;
                let countdownElement = document.querySelector('.countdown');
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }
                if(countdown < 0){
                    clearInterval(interval);
                    document.querySelector('.countdown').style.display = "none";
                }
            },100);
        }else{

            let seektime = correctedNow()- starttime;
          //  seektime = 250000; // testing song end   
            dblog("seeking to " + player.ms2tick(seektime));
            playing = true;
            player.play();
            player.jump(player.ms2tick(seektime));
            setTimeout(function(){
             //   player.stop();
            },1000);
        }
    }
    catch (e) {
        dblog(e);
    }
}

function clear() {
    if (player) player.stop();
    playing = false;
}

function playStop() {
    if (playing) {
      player.stop();
      playing = false;
    }
    else {
      player.play();
      playing = true;
    }
}

function songOver(){
    playing = false;
    stopGraphics();
}





/***************
 * Graphics/Animation functions
 */


let channelVoiceElems = {};


function setupGraphics(){

}

// hide config and start buttons
function startGraphics(){
    document.querySelector('.startandconfig').style.display = "none";
}

// show config and start buttons
function stopGraphics(){
    document.querySelector('.startandconfig').style.display = "flex";
}

/**
 * Place the dynambs on the screen
 * they spin around the singers at different rates.
 * @param {*} dynamblist 
 */
function graphicsPlaceDynambs(dynamblist){
//    dblog("graphicsPlaceDynambs");

    let channelkeys = Object.keys(channelVoiceElems);
    let numchannels = channelkeys.length;

//    dblog("graphicsPlaceDynambs",channelVoiceElems);

    for(let i = 0; i < numchannels; i++){
        let channelelem = channelVoiceElems[channelkeys[i]];
        let singer = channelelem[0];
        if(!singer.iconlist){
            singer.iconlist = [];
        }
        let singerdynambs = singer.dynambs;
        let singerleft = parseInt(singer.style.left.replace("px",""));
        let singertop = parseInt(singer.style.top.replace("px",""));

        for(let j = 0; j < singerdynambs.length; j++){
            let singerdynamb = singerdynambs[j];
            let iconid = "icon"+singerdynamb.id+singerdynamb.text;
            if(singer.iconlist.includes(iconid)){
                continue;
            }
            singer.iconlist.push(iconid);
            let singercenterx = Math.floor(
                singerleft + (singerWidth / 2)
                );
            let singercentery = Math.floor(
                singertop + (singerHeight / 2)
                )

            let sposx = singercenterx;
            let sposy = singercentery - ((singerHeight / 2) * 1.2) ;      

            dynambicon = singerdynamb.icon;
            iconelem = document.createElement("p");
            iconelem.classList.add("dynambicon");
            iconelem.classList.add("channeldynamb"+channelkeys[i]);
            iconelem.setAttribute("id",iconid);
            iconelem.innerText = dynambicon;
            iconelem.style.position = "absolute";

            iconelem.style.left = sposx.toString()+"px";
            iconelem.style.top = sposy.toString()+"px";
            let rotationt = (Math.random() * 6) + 4;
            iconelem.style.animation = "rotation1 "+rotationt.toString()+"s linear 0s infinite normal none";
            let transform = (singercenterx - sposx).toString()+"px "+((singercentery - sposy)).toString()+"px";
            iconelem.style["transform-origin"] = transform;

            document.getElementById("owlidaycontent").appendChild(iconelem);           

        }
    }
}


// Example usage in your context:
function placeSingers(channelList, allChannels) {

    let singerindex = 0;
    let staying =  channelList.filter(x => prevMyChannels.includes(x));
    let adding = channelList.filter(x => !prevMyChannels.includes(x));
    let leaving = prevMyChannels.filter(x => !channelList.includes(x));
    let channel = false;
    for(let i = 0; i < leaving.length; i++){
        channel = leaving[i];
        dblog("REMOVING " + channel);
        channelVoiceElems[channel][0].remove();
        channelVoiceElems[channel][1].remove();
        delete channelVoiceElems[channel];

        // remove dyanmbs w class "channeldynamb"+channel
        var dynambs = document.getElementsByClassName("channeldynamb"+channel);

        while(dynambs[0]) {
            dynambs[0].parentNode.removeChild(dynambs[0]);
        } 
    }

    const placements = placeElementsWithoutOverlap(
        allChannels.length, 
        screenwidth, 
        screenheight, 
        singerWidth, 
        singerHeight
    );

    // Sort placements by distance from center to maintain order
    placements.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);

    let i = 0;
    adding.forEach((channel, index) => {
        let placementIndex = allChannels.indexOf(channel);
        dblog("placing " + channel + " at " + placementIndex + " of " + placements.length);
        const placement = placements[placementIndex];
        
       // channel = adding[i];
        dblog("ADDING " + channel);
        singerimage = singerimages[singerindex % singerimages.length];
        singer = [];
        singer[0]= document.createElement("img");
        singer[1]= document.createElement("img");
        singer[0].setAttribute("src", singerimage[0]);
        singer[1].setAttribute("src", singerimage[1]);
        singer[0].setAttribute("width", singerWidth);
        singer[1].setAttribute("width", singerWidth);
        singer[0].setAttribute("id", "singer"+channel+"_0");
        singer[1].setAttribute("id", "singer"+channel+"_1");
        /*
        singer = document.createElement("p");
        singer.innerText = "😐";
        */
        singer[0].classList.add("singer");
        singer[1].classList.add("singer");
        singer[0].style.position = "absolute";
        singer[1].style.position = "absolute";
        
        singer[0].style.left = `${placement.left}px`;
        singer[1].style.left = `${placement.left}px`;
        singer[0].style.top = `${placement.top}px`;
        singer[1].style.top = `${placement.top}px`;

        document.getElementById("owlidaycontent").appendChild(singer[0]);
        document.getElementById("owlidaycontent").appendChild(singer[1]);
        channelVoiceElems[channel] = singer;        
        i++;
        singerindex++;

    });
}

function placeElementsWithoutOverlap(numElements, windowWidth, windowHeight, elementWidth, elementHeight) {
    const grid = [];
    const elements = [];

    const gridCols = Math.floor(windowWidth / elementWidth);
    const gridRows = Math.floor(windowHeight / elementHeight);

    // Create grid
    for (let i = 0; i < gridRows; i++) {
        grid[i] = new Array(gridCols).fill(false);
    }

    // Calculate center grid coordinates
    const centerRow = Math.floor(gridRows / 2);
    const centerCol = Math.floor(gridCols / 2);

    // Create a priority list of grid positions, sorted by distance from center
    const gridPositions = [];
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            // Calculate distance from center using Euclidean distance
            const distanceFromCenter = Math.sqrt(
                Math.pow(row - centerRow, 2) + 
                Math.pow(col - centerCol, 2)
            );
            
            gridPositions.push({
                row, 
                col, 
                distanceFromCenter
            });
        }
    }

    // Sort positions by distance from center (closest first)
    gridPositions.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);

    // Try to place elements
    for (let i = 0; i < numElements; i++) {
        let placed = false;
        
        // Go through sorted positions
        for (const pos of gridPositions) {
            const { row, col } = pos;

            if (!grid[row][col]) {
                // Mark grid position as occupied
                grid[row][col] = true;

                // Calculate pixel position
                const left = col * elementWidth;
                const top = row * elementHeight;

                elements.push({
                    left: left,
                    top: top,
                    distanceFromCenter: pos.distanceFromCenter
                });

                placed = true;
                break;
            }
        }

        // If we couldn't place an element, break
        if (!placed) {
            console.warn(`Could only place ${i + 1} elements out of ${numElements}`);
            break;
        }
    }

    return elements;
}


/**
 * Making the mascot "SING"!
 * requires a bit of timing, so the mouth stays open for a bit.
 * @param {*} channel 
 */
let channelsOn = {};
let  mouths = 0;
function graphicsNoteOn(channel){
    mouths++;
    if(myChannels.includes(channel.toString()) && !channelsOn[channel]){
        channelsOn[channel] = true;    
        try{
            if(channelVoiceElems[channel][1].style.display != "none"){
                channelVoiceElems[channel][1].style.display = "block";
                setTimeout(function(){
                    channelVoiceElems[channel][1].style.display = "none";
                }, 25);
            }
        }catch(e){
            dblog("no element for channel "+ channel, e);
        }
    }
}

/**
 * Closing the mouth
 * @param {*} channel 
 */ 
function graphicsNoteOff(channel){
  //  dblog("off", channel);
    channelsOn[channel] = false;     
    mouths--;       
    if(myChannels.includes(channel.toString())){  
    //    channelVoiceElems[channel].innerText = "😐";
        try{
            channelVoiceElems[channel][1].style.display = "block";
        }catch(e){
            dblog("no element for channel "+ channel, e);
        }
    }
}






//
/******
Utility Functions
*/

let scalemin = 1000;
let scalemax = -10000;
/**
 * Scale the input value to the output range
 * the input is a value between scalemin and scalemax.
 * but scalemin and scalemax are updated to the min and max of the input values.
 * the output is a value between outmin and outmax
 * @param {*} input 
 * @param {*} outmin 
 * @param {*} outmax 
 * @returns 
 */
function dynScale(input, outmin, outmax){
    if(input > scalemax){
        scalemax = input;
    }
    if(input < scalemin){
        scalemin = input;
    }
    let inrange = scalemax - scalemin;
    let outrange = outmax - outmin;

    let scalefactor = outrange / inrange;
    let diff = input - scalemin;
    let difffraction = diff / inrange;
    let output = difffraction * outrange + outmin;
//    dblog(input, scalemin, scalemax,output );

    return output
}

/**
 * send a ws message
 * @param {*} address 
 * @param {*} data 
 */
function message(address, data){

    let msg = {address : address,
        data: data};  

    dblog("sending message ", address, msg);
    if(wsready){
    //    var buf = new Buffer.from(JSON.stringify(msg));
        ws.send(JSON.stringify(msg));
    }else{
        dblog("ws not ready");
    }
}



/*****************
 * Handle time sync
 */
function timecheck(){
    let data = {
        clienttime : Date.now()
    }
    message("gettime", data);
}

/**
 * Process the server time message
 * so determine what the time skew is.
 * The time skew is used to adjust the client time to the server time.
 * So all devices are in sync.
 * The skew error between devices is 
 * up to half of the difference between 
 * the lag from the client to the server 
 * and the lag from the server to the client
 * (because the client divides the total roundtrip by 2, 
 * but maybe the lag was a lot more in one direction than the other).
 */
function processServerTime(msg){
    dblog("processservertime" , msg);
    let now = Date.now();
    let clientsend = msg.data.clientnow;
    let servertime = msg.data.servernow;
    let difference = msg.data.difference;
    let roundtrip = now - clientsend;
    dblog("roundtrip ", roundtrip);
//    timeskew = difference;
    timeskew = difference + (roundtrip/2);

    document.querySelectorAll('.time').forEach(elem => {
        elem.textContent = "now: " + now + "\nclientsent  " + clientsend + "\nservertime " + servertime + "\ndifference" + difference + "\nroundtrip " + roundtrip + "\ntimeskew" + timeskew;
    });
}

/***
 * return a time adjusted for the known skew from the system's accepted time.
 */
function correctedNow(){
//    return  Date.now() + timeskew;
    return  Date.now() - timeskew;
}