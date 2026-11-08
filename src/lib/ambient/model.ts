export const SOUND_IDS=["rain","ocean","noise"] as const;
export type SoundId=typeof SOUND_IDS[number];
export type AmbientSettings={sound:SoundId;volume:number;muted:boolean;alarmVolume:number};
export const DEFAULT_AUDIO:AmbientSettings={sound:"rain",volume:.45,muted:false,alarmVolume:1};
export function isSoundId(value:unknown):value is SoundId{return SOUND_IDS.some(id=>id===value);}
export function clampVolume(value:number){return Number.isFinite(value)?Math.min(1,Math.max(0,value)):DEFAULT_AUDIO.volume;}
export function parseAudioSettings(raw:string|null):AmbientSettings{
 try{const p=JSON.parse(raw??"null");if(!p||p.version!==1)return {...DEFAULT_AUDIO};
 return {sound:isSoundId(p.sound)?p.sound:DEFAULT_AUDIO.sound,volume:typeof p.volume==="number"?clampVolume(p.volume):DEFAULT_AUDIO.volume,muted:typeof p.muted==="boolean"?p.muted:false,alarmVolume:typeof p.alarmVolume==="number"&&Number.isFinite(p.alarmVolume)?Math.min(1,Math.max(0,p.alarmVolume)):1};
 }catch{return {...DEFAULT_AUDIO};}
}
export function audioSettingsJson(settings:AmbientSettings){return JSON.stringify({version:1,sound:settings.sound,volume:settings.volume,muted:settings.muted,alarmVolume:settings.alarmVolume});}

