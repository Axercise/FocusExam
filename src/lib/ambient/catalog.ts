import type {SoundId} from "./model";
export const ambientSounds=[
 {id:"rain",src:"/audio/rain.mp3",author:"rasunter255",originalTitle:"gentle rainfall.wav",source:"https://freesound.org/people/rasunter255/sounds/416227/"},
 {id:"ocean",src:"/audio/ocean.mp3",author:"tec_studio",originalTitle:"Ocean waves mono.mp3",source:"https://freesound.org/people/tec_studio/sounds/232186/"},
 {id:"noise",src:"/audio/noise.mp3",author:"theundecided",originalTitle:"White noise",source:"https://freesound.org/people/theundecided/sounds/165058/"}
] satisfies {id:SoundId;src:string;author:string;originalTitle:string;source:string}[];
export const CC0_URL="https://creativecommons.org/publicdomain/zero/1.0/";

