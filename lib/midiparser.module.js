
// turn this into a module
// it needs to generate a series of noteOn/noteOff messages with aboslute times,
// with assumption that score start X seconds in the future.
// also w option to add other, non-midi messages
let midiParser  = require('midi-parser-js');
let fs = require('fs');

let MidiParser = {
  midiFile : false,

  parsedFile : false,

  startTime : 0,

  channels : {},
  numChannels : 0,

  parseMidiFile(){

    let data = fs.readFileSync(this.midiFile);
    this.parsedFile  = midiParser.parse(data);
    
//    console.log(`Tracks: ${this.parsedFile .tracks}, TimeDivision: ${this.parsedFile .timeDivision}`);
    for(let i in this.parsedFile .track) {
   //   console.log(`Track ${i}`);
      let curTime = this.startTime;
      for(let j in this.parsedFile .track[i].event) {
        let event = this.parsedFile .track[i].event[j];
          curTime = curTime + event.deltaTime;
          this.parsedFile .track[i].event[j].absTime = curTime;
      }
    }
    
    for(let i in this.parsedFile .track) {
    //    console.log(`Track ${i}`);

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

exports.MidiParser = MidiParser;




