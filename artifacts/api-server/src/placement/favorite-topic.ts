import type {Result} from "./types";
export const TOPIC_MARKER="FAVORITE_TOPIC";
const nouns:Record<string,[string,string]>={
 "القطارات":["قطارات","trains"],"قطارات":["قطارات","trains"],
 "الديناصورات":["ديناصورات","dinosaurs"],"الحيوانات":["حيوانات","animals"],
 "القطط":["قطط","cats"],"السيارات":["سيارات","cars"],
 "كرة القدم":["كرات القدم","footballs"],"الرسم":["أقلام","pencils"],"الفضاء":["كواكب","planets"],
};
export function favoriteTopic(r:Result,state:Record<string,unknown>,language:"ar"|"en"){
 const key=language==="ar"?"favoriteTopicAr":"favoriteTopicEn",cached=state[key];
 if(typeof cached==="string"&&cached.trim())return {word:cached,key,translate:false};
 const original=r.favorite_thing?.trim()??"";
 if(!original)return {word:language==="ar"?"أشياء":"objects",key,translate:false};
 const known=nouns[original.replace(/[\u064B-\u065F\u0670\u0640]/g,"")];
 if(known)return {word:known[language==="ar"?0:1],key,translate:false};
 // The model supplies only a localized countable noun; numbers and answers stay server-owned.
 return {word:TOPIC_MARKER,key,translate:true};
}
