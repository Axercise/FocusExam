import type {AmbientSettings,SoundId} from "./model";
export type AudioStatus="idle"|"loading"|"playing"|"paused"|"error";
export type AudioReason=null|"load"|"blocked"|"unsupported"|"interrupted"|"otherTab";
export type AudioSnapshot=AmbientSettings&{status:AudioStatus;reason:AudioReason;engaged:boolean};
type Voice={source:AudioBufferSourceNode;gain:GainNode;started:number;offset:number};
type Dependencies={createContext?:()=>AudioContext;fetchAudio?:(url:string,signal:AbortSignal)=>Promise<ArrayBuffer>;claim?:()=>void;canPlay?:()=>boolean};
export class AmbientEngine{
 private state:AudioSnapshot;
 private listeners=new Set<()=>void>();
 private context:AudioContext|null=null;
 private voice:Voice|null=null;
 private buffers=new Map<SoundId,AudioBuffer>();
 private request:AbortController|null=null;
 private epoch=0;
 private offset=0;
 private catalog:readonly {id:SoundId;src:string}[];
 private dependencies:Dependencies;
 constructor(catalog:readonly {id:SoundId;src:string}[],settings:AmbientSettings,dependencies:Dependencies={}){
  this.catalog=catalog;this.dependencies=dependencies;
  this.state={...settings,status:"idle",reason:null,engaged:false};
 }
 getSnapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private patch(value:Partial<AudioSnapshot>){this.state={...this.state,...value};this.listeners.forEach(fn=>fn());}
 private output(){return this.state.muted?0:this.state.volume*this.state.volume;}
 private ramp(value:number){const context=this.context,gain=this.voice?.gain.gain;if(!context||!gain)return;gain.cancelScheduledValues(context.currentTime);gain.setValueAtTime(gain.value,context.currentTime);gain.linearRampToValueAtTime(value,context.currentTime+.045);}
 private stopVoice(){
  const voice=this.voice,ctx=this.context;if(!voice||!ctx)return;
  this.offset=(voice.offset+Math.max(0,ctx.currentTime-voice.started))%(voice.source.buffer?.duration||1);
  this.voice=null;
  if(ctx.state==="running"){
   voice.gain.gain.cancelScheduledValues(ctx.currentTime);voice.gain.gain.setValueAtTime(voice.gain.gain.value,ctx.currentTime);voice.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.035);voice.source.stop(ctx.currentTime+.04);
  }else{voice.source.stop();voice.source.disconnect();voice.gain.disconnect();}
 }
 applySettings(settings:AmbientSettings){
  const changed=settings.sound!==this.state.sound;
  if(changed){this.pause();this.offset=0;}
  this.patch(settings);this.ramp(this.output());
 }
 select(sound:SoundId){
  if(!this.catalog.some(track=>track.id===sound)||sound===this.state.sound)return;
  const active=this.state.status==="playing"||this.state.status==="loading";
  this.pause();this.offset=0;this.patch({sound,reason:null});
  if(active)void this.play();
 }
 pause(reason:AudioReason=null){
  ++this.epoch;this.request?.abort();this.request=null;this.stopVoice();
  this.patch({status:this.state.engaged?"paused":"idle",reason});
 }
 async play(){
  if(this.state.status==="playing")return;
  const token=++this.epoch;this.request?.abort();this.stopVoice();
  const controller=new AbortController();this.request=controller;
  this.patch({status:"loading",reason:null,engaged:true});
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   if(!this.context||this.context.state==="closed"){
    if(!this.dependencies.createContext&&typeof AudioContext==="undefined")throw new ReferenceError("AudioContext unavailable");
    this.context=this.dependencies.createContext?this.dependencies.createContext():new AudioContext();
    this.context.addEventListener("statechange",()=>{
     if(this.state.status==="playing"&&this.context?.state!=="running")this.pause("interrupted");
    });
   }
   const ctx=this.context;
   const resumed=ctx.resume();this.dependencies.claim?.();await resumed;
   if(token!==this.epoch)return;
   if(ctx.state!=="running")throw new DOMException("Audio needs a gesture","NotAllowedError");
   const sound=this.state.sound;
   let buffer=this.buffers.get(sound);
   if(!buffer){
    const track=this.catalog.find(track=>track.id===sound);if(!track)throw new Error("Unknown sound");
    timeout=setTimeout(()=>controller.abort(),20000);
    const bytes=this.dependencies.fetchAudio?await this.dependencies.fetchAudio(track.src,controller.signal):await fetch(track.src,{signal:controller.signal}).then(result=>{if(!result.ok)throw new Error("Audio unavailable");return result.arrayBuffer();});
    if(token!==this.epoch)return;
    buffer=await ctx.decodeAudioData(bytes);
    if(token!==this.epoch)return;
    this.buffers.set(sound,buffer);
   }
   if(token!==this.epoch)return;
   if(controller.signal.aborted)throw new Error("Audio request cancelled");
   if(this.dependencies.canPlay&&!this.dependencies.canPlay()){this.pause("otherTab");return;}
   if(ctx.state!=="running")throw new DOMException("Audio interrupted","NotAllowedError");
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(ctx.destination);
   gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(this.output(),ctx.currentTime+.08);
   source.onended=()=>{source.disconnect();gain.disconnect();};
   source.start(0,this.offset%buffer.duration);this.voice={source,gain,started:ctx.currentTime,offset:this.offset%buffer.duration};
   this.request=null;this.patch({status:"playing",reason:null});
  }catch(error){
   if(token!==this.epoch)return;
   const reason:AudioReason=error instanceof ReferenceError?"unsupported":error instanceof DOMException&&error.name==="NotAllowedError"?"blocked":"load";
   this.patch({status:"error",reason});
  }finally{if(timeout!==undefined)clearTimeout(timeout);}
 }
 duck(){
  const ctx=this.context,gain=this.voice?.gain.gain;if(!ctx||!gain||this.state.status!=="playing")return;
  const value=this.output();gain.cancelScheduledValues(ctx.currentTime);gain.setValueAtTime(gain.value,ctx.currentTime);gain.linearRampToValueAtTime(value*.2,ctx.currentTime+.04);gain.linearRampToValueAtTime(value*.2,ctx.currentTime+.65);gain.linearRampToValueAtTime(value,ctx.currentTime+.9);
 }
 destroy(){
  this.pause();const ctx=this.context;this.context=null;this.buffers.clear();this.offset=0;
  if(ctx)void ctx.close().catch(()=>{});
 }
 dismiss(){this.pause();this.patch({engaged:false,reason:null});}
}

