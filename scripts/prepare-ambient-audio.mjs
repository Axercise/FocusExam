import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
const sources=[
 {id:"rain",title:"gentle rainfall.wav",author:"rasunter255",page:"https://freesound.org/people/rasunter255/sounds/416227/",file:"https://cdn.freesound.org/previews/416/416227_5438412-hq.mp3"},
 {id:"ocean",title:"Ocean waves mono.mp3",author:"tec_studio",page:"https://freesound.org/people/tec_studio/sounds/232186/",file:"https://cdn.freesound.org/previews/232/232186_1431924-hq.mp3"},
 {id:"noise",title:"White noise",author:"theundecided",page:"https://freesound.org/people/theundecided/sounds/165058/",file:"https://cdn.freesound.org/previews/165/165058_947433-hq.mp3"}
];
fs.mkdirSync(".cache/ambient-sources",{recursive:true});fs.mkdirSync("public/audio",{recursive:true});
const hash=bytes=>createHash("sha256").update(bytes).digest("hex"),records=[];
for(const source of sources){
 const response=await fetch(source.page);if(!response.ok)throw new Error("Unable to verify license: "+source.id);
 const html=await response.text();if(!html.includes("creativecommons.org/publicdomain/zero/1.0/"))throw new Error("CC0 license not found: "+source.id);
 const input=path.join(".cache/ambient-sources",source.id+".mp3");
 if(!fs.existsSync(input)){const audio=await fetch(source.file);if(!audio.ok)throw new Error("Audio download failed: "+source.id);fs.writeFileSync(input,Buffer.from(await audio.arrayBuffer()));}
 const output="public/audio/"+source.id+".mp3";
 const filter="[0:a]atrim=0:60,asetpts=PTS-STARTPTS,asplit=3[b][h][t];[b]atrim=1:59,asetpts=PTS-STARTPTS[body];[h]atrim=0:1,asetpts=PTS-STARTPTS[head];[t]atrim=59:60,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=1:c1=tri:c2=tri[seam];[body][seam]concat=n=2:v=0:a=1,loudnorm=I=-20:TP=-3:LRA=7[out]";
 const result=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",input,"-filter_complex",filter,"-map","[out]","-ac","1","-ar","32000","-c:a","libmp3lame","-b:a","96k","-map_metadata","-1",output],{encoding:"utf8"});
 if(result.status!==0)throw new Error(result.stderr||"ffmpeg unavailable");
 records.push({...source,license:"CC0-1.0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",verifiedAt:new Date().toISOString(),sourceSha256:hash(fs.readFileSync(input)),asset:"/audio/"+source.id+".mp3",assetSha256:hash(fs.readFileSync(output)),bytes:fs.statSync(output).size,processing:"Public HQ preview; first 60 seconds; 1-second tail/head crossfade forming a 59-second loop; loudness normalized to -20 LUFS; mono 32 kHz MP3 96 kbps."});
 console.log(source.id+": "+fs.statSync(output).size+" bytes");
}
fs.writeFileSync("public/audio/licenses.json",JSON.stringify(records,null,2)+"\n");

