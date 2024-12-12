
/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */



class MidiParser  {

  constructor(){
    this.midiFile = false;
    this.parsedFile = false;
    this.startTime = 0;
    this.channels = {};
    this.numChannels = 0;
    this.midiParser  = require('midi-parser-js');
    this.fs = require('fs');
  }


  parseMidiFile(){

    let data = this.fs.readFileSync(this.midiFile);
    this.parsedFile  = this.midiParser.parse(data);
    
    for(let i in this.parsedFile .track) {
      let curTime = this.startTime;
      for(let j in this.parsedFile .track[i].event) {
        let event = this.parsedFile .track[i].event[j];
          curTime = curTime + event.deltaTime;
          this.parsedFile .track[i].event[j].absTime = curTime;
      }
    }
    
    for(let i in this.parsedFile .track) {
        for(let j in this.parsedFile .track[i].event) {
          let event = this.parsedFile .track[i].event[j];
          if(Number.isInteger(event.channel)){
            if(!this.channels[event.channel]){
              this.channels[event.channel] = {channel: event.channel, notecount : 0};
            }
            this.channels[event.channel].notecount++;
          }
          switch(event.type) {
            case 8: // note off
    //          console.log("off ", event);
              break;
            case 9: // note on
  //              console.log("on ", event);
                break;
            default:
//              console.log(j, event);
              break;
            }
        }
        this.numChannels = Object.keys(this.channels).length;
    }
  }

}

module.exports = MidiParser;




