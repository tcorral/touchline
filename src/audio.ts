/** Tiny Web Audio synthesizer for the bundled standard MIDI files (format 0).
 * No Web MIDI device, plugins or third-party network requests required. */
type Note={start:number;duration:number;pitch:number;velocity:number};
type Tune={notes:Note[];length:number};
const MUSIC_TEMPO_SCALE=1.21;
function midiToTune(buffer:ArrayBuffer):Tune{
 const v=new DataView(buffer);let pos=0;
 const byte=()=>v.getUint8(pos++),u16=()=>{const n=v.getUint16(pos);pos+=2;return n;};
 const u32=()=>{const n=v.getUint32(pos);pos+=4;return n;};
 const str=(n:number)=>{let s='';while(n--)s+=String.fromCharCode(byte());return s;};
 const variable=()=>{let n=0,b=0;do{b=byte();n=(n<<7)|(b&127);}while(b&128);return n;};
 if(str(4)!=='MThd')throw Error('Invalid MIDI header');const headerLength=u32();const format=u16(),tracks=u16(),division=u16();pos=8+headerLength;
 if(format>1||division&0x8000)throw Error('Unsupported MIDI type');
 const result:Note[]= [];let overall=0;
 for(let tr=0;tr<tracks;tr++){
  if(str(4)!=='MTrk')throw Error('Invalid MIDI track');const end=pos+u32();let tick=0,seconds=0,tempo=500000,running=0;
  const active=new Map<string,{start:number;velocity:number}>();
  while(pos<end){const delta=variable();tick+=delta;seconds+=delta*tempo/1000000/division;let status=byte();if(status<128){pos--;status=running;}else if(status<240)running=status;
   if(status===255){const kind=byte(),size=variable(),stop=pos+size;if(kind===81&&size===3)tempo=(byte()<<16)|(byte()<<8)|byte();pos=stop;continue;}
   if(status===240||status===247){pos+=variable();continue;}
   const kind=status&240,channel=status&15;
   const a=byte(),b=(kind===192||kind===208)?0:byte();
   if(kind===144&&b>0){active.set(channel+':'+a,{start:seconds,velocity:b});}
   else if(kind===128||(kind===144&&b===0)){const k=channel+':'+a,started=active.get(k);if(started){result.push({start:started.start,duration:Math.max(.035,seconds-started.start),pitch:a,velocity:started.velocity});active.delete(k);}}
  }overall=Math.max(overall,seconds);pos=end;
 }
 return {notes:result,length:overall};
}
export class GameAudio {
 private context:AudioContext|null=null;
 private tunes=new Map<string,Tune>();private musicNodes=new Set<AudioScheduledSourceNode>();
 private musicIndex=0;private nextMusicTime=0;private musicActive=false;private musicTimer=0;private effectsAt=0;
 enabled=false;
 async enable(){
  if(!this.context)this.context=new AudioContext();await this.context.resume();
  if(!this.tunes.size){await Promise.all(['kick','goal','match_music','whistle_start','whistle_end'].map(async name=>{
   const response=await fetch(`assets/audio/${name}.mid`);if(!response.ok)throw Error(`Cannot load MIDI: ${name}`);
   this.tunes.set(name,midiToTune(await response.arrayBuffer()));
  }));}
  this.enabled=true;
 }
 private trackMusic(source:AudioScheduledSourceNode){this.musicNodes.add(source);source.addEventListener('ended',()=>this.musicNodes.delete(source),{once:true});}
 private note(note:Note,start:number,volume:number,music:boolean,whistle=false){const ctx=this.context!;const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=whistle?'sine':music?'sawtooth':'square';osc.frequency.value=440*Math.pow(2,(note.pitch-69)/12);
  const amplitude=volume*(note.velocity/127);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(amplitude,start+.012);
  gain.gain.setValueAtTime(amplitude*.75,start+Math.min(.08,note.duration*.45));gain.gain.exponentialRampToValueAtTime(.001,start+note.duration+.05);
  osc.connect(gain).connect(ctx.destination);if(music)this.trackMusic(osc);osc.start(start);osc.stop(start+note.duration+.07);
 }
 private musicBeat(start:number,kick:boolean){const ctx=this.context!,duration=kick?.18:.11,gain=ctx.createGain();
  gain.gain.setValueAtTime(kick?.14:.045,start);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
  if(kick){const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(125,start);osc.frequency.exponentialRampToValueAtTime(48,start+duration);
    osc.connect(gain).connect(ctx.destination);this.trackMusic(osc);osc.start(start);osc.stop(start+duration);
  }else{const frames=Math.floor(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.connect(gain).connect(ctx.destination);this.trackMusic(noise);noise.start(start);noise.stop(start+duration);
  }
 }
 effect(name:'kick'|'goal'|'whistle_start'|'whistle_end'){
  if(!this.enabled||!this.context)return;const now=this.context.currentTime;
  if(name==='kick'&&now-this.effectsAt<.09)return;
  if(name==='kick')this.effectsAt=now;
  const tune=this.tunes.get(name);if(!tune)return;
  for(const note of tune.notes)this.note(note,now+note.start,name==='goal'?.16:name.startsWith('whistle')?.19:.07,false,name.startsWith('whistle'));
 }
 startMusic(){if(!this.enabled||!this.context||this.musicActive)return;this.musicActive=true;this.musicIndex=0;this.nextMusicTime=this.context.currentTime+.05;this.scheduleMusic();this.musicTimer=window.setInterval(()=>this.scheduleMusic(),150);}
 private scheduleMusic(){if(!this.musicActive||!this.context)return;const tune=this.tunes.get('match_music');if(!tune)return;
  const now=this.context.currentTime;
  while(this.nextMusicTime<now+.5){const offset=this.nextMusicTime;
    for(const note of tune.notes)this.note({...note,start:note.start/MUSIC_TEMPO_SCALE,duration:note.duration/MUSIC_TEMPO_SCALE},offset+note.start/MUSIC_TEMPO_SCALE,.018,true);
   const beatLength=60/(132*MUSIC_TEMPO_SCALE),beatCount=Math.floor(tune.length/MUSIC_TEMPO_SCALE/beatLength);
   for(let beat=0;beat<beatCount;beat++)this.musicBeat(offset+beat*beatLength,beat%4===0||beat%4===2);
    this.nextMusicTime+=tune.length/MUSIC_TEMPO_SCALE;this.musicIndex++;
  }
 }
 stopMusic(){this.musicActive=false;clearInterval(this.musicTimer);for(const source of this.musicNodes){try{source.stop();}catch{}}this.musicNodes.clear();}
 disable(){this.stopMusic();this.enabled=false;if(this.context)this.context.suspend();}
}
