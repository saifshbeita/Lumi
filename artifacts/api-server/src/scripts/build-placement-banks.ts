// Source conversion only. These banks stay server-side, never in public assets.
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Bank, Item, Option, PlacementTest } from "../placement/types";
const root = resolve(import.meta.dirname, "../../../..");
mkdirSync(resolve(root, "docs/placement"), { recursive: true });
for (const [from, to] of [
  ["dyslexia_1791659789668.md", "dyslexia.md"],
  ["learning-difficulties_1791659789669.md", "learning-difficulties.md"],
  ["autism_1791659789669.md", "autism.md"],
]) copyFileSync(resolve(root, "attached_assets", from), resolve(root, "docs/placement", to));
const interestNames = ["🐶 حيوانات","🦖 ديناصورات","🚗 سيارات","🚂 قطارات","🚀 الفضاء","⚽ كرة قدم","🎨 رسم","🎮 ألعاب","🧱 بناء وتركيب","🌍 بلاد وخرائط","🔢 أرقام","🎵 موسيقى"];
const interestIds = ["animals","dinosaurs","cars","trains","space","football","drawing","games","building","maps","numbers","music"];
const interests: Option[] = interestNames.map((label_ar,i) => ({ id: interestIds[i], label_ar }));
function options(values: string[], tags: string[] = []): Option[] {
  return values.map((label_ar,i) => ({ id: ["a","b","c","d","e","f"][i], label_ar, correct: i === 0, ...(i && tags[i-1] ? { tag: tags[i-1] } : {}) }));
}
function bank(test: PlacementTest, defs: [string,string,string|undefined,boolean,Item["audio"]][]): Bank {
  return { test, version:1, sections: defs.map(([id,title_ar]) => ({ id,title_ar,items:[] })) };
}
function add(b: Bank, section: string, domain: string|undefined, stop: boolean, audio: Item["audio"], id: string, prompt_ar: string, values: string[], extra: Partial<Item> = {}, tags?: string[]) {
  const item: Item = { id, section, domain, stop_rule:stop,audio,type:"choice",prompt_ar,options:options(values,tags),...extra };
  b.sections.find(s => s.id===section)!.items.push(item);
}
const d=bank("dyslexia",[["A","الأصوات","phonology",true,"auto"],["B","الحروف","letters",true,"auto"],["C","التشكيل","diacritics",true,"auto"],["D","الكلمات","word_reading",true,"auto"],["E","الفهم",undefined,true,"auto"],["F","عنّي",undefined,false,"auto"]]);
[
 ["A1","أيّ صورة تبدأ بصوت «سـ»؟",["🐟","🚪","🌙"]],
 ["A2","أيّ كلمة آخرها مثل «نار»؟",["🏠","🐕","☀️"]],
 ["A3","كم مقطع في كلمة «دَجاجة» 🐔؟",["👏👏👏","👏👏","👏"]],
 ["A4","اسمع: «قـ... طّـ... ة». شو الكلمة؟",["🐱","🌙","🚂"]],
].forEach(([id,p,v])=>add(d,"A","phonology",true,"auto",id as string,p as string,v as string[]));
[
 ["B1","اضغط على حرف «م»",["م","ب","ل"],["shape","shape"],"ميم، مَـ. اضغط على حرف ميم."],
 ["B2","اضغط على حرف «ث»",["ث","ت","ب"],["dots","dots"],"ثاء، ثَـ. اضغط على حرف ثاء."],
 ["B3","اضغط على حرف «خ»",["خ","ح","ج"],["dots","dots"],"خاء، خَـ. اضغط على حرف خاء."],
 ["B4","اضغط على «ت» في وسط الكلمة",["ـتـ","ـنـ","ـيـ"],["dots","position"],"تاء، تَـ. اضغط على تاء في وسط الكلمة."],
 ["B5","اضغط على «غ» في أول الكلمة",["غـ","عـ","فـ"],["dots","position"],"غين، غَـ. اضغط على غين في أول الكلمة."],
].forEach(([id,p,v,t,tts])=>add(d,"B","letters",true,"auto",id as string,p as string,v as string[],{tts_ar:tts as string},t as string[]));
[
 ["C1","اسمع: «بَ»",["بَ","بُ","بِ"],"harakat"],
 ["C2","اسمع: «سِ»",["سِ","سَ","سُ"],"harakat"],
 ["C3","اسمع: «كِتابٌ»",["كِتابٌ","كِتابًا","كِتابٍ"],"tanween"],
 ["C4","اسمع: «دَرَّسَ»",["دَرَّسَ","دَرَسَ","دُرِسَ"],"shadda"],
].forEach(([id,p,v,t])=>add(d,"C","diacritics",true,"auto",id as string,p as string,v as string[],{},[t as string,t as string]));
[
 ["D1","«بَيْت»",["بَيْت","بِنْت","ثَبَت"],["dots","dots"]],
 ["D2","«جَمَل»",["جَمَل","حَمَل","جَبَل"],["dots","shape"]],
 ["D3","«كَتَبَ»",["كَتَبَ","كَبَتَ","بَكَتَ"],["order","order"]],
 ["D4","«مدرسة»",["مدرسة","مدسرة","مرسدة"],["order","order"]],
].forEach(([id,p,v,t])=>add(d,"D","word_reading",true,"auto",id as string,p as string,v as string[],{},t as string[]));
const listen="ذَهَبَتْ سَلْمى مَعَ أَبيها إِلى البَحْر. بَنَتْ سَلْمى قَلْعَةً مِنَ الرَّمْل. جاءَتْ مَوْجَةٌ كَبيرَةٌ وَهَدَمَتِ القَلْعَة. ضَحِكَتْ سَلْمى وَبَنَتْ قَلْعَةً جَديدَة.";
const read="كانَ لِعُمَرَ قِطٌّ صَغيرٌ اسْمُهُ نَمِر. نَمِرٌ يُحِبُّ الحَليبَ، وَيَنامُ عَلى الكَنَبَة.";
add(d,"E","listening",true,"auto","E1","أين ذهبت سلمى؟",["🌊","🏫","🌳"],{passage:listen,passage_audio:true,hidden_passage:true});
add(d,"E","listening",true,"auto","E2","شو عملت سلمى بعد ما الموجة هدمت القلعة؟",["🏰","😢","🏠"],{passage:listen,passage_audio:true,hidden_passage:true});
add(d,"E","reading_comp",true,"auto","E3","شو بحب نمر؟",["🥛","🐟","🍎"],{passage:read,passage_audio:false});
add(d,"E","reading_comp",true,"auto","E4","وين بنام نمر؟",["🛋️","🛏️","🌳"],{passage:read,passage_audio:false});
add(d,"F",undefined,false,"auto","F1","شو بتحب؟ اختار لحد ٣",[],{type:"multi_pick",options:interests,save:"interests"});
add(d,"F",undefined,false,"auto","F2","بتحب أقرأ لك أنا، ولّا تقرأ إنت؟",[],{type:"preference",save:"reading",options:[{id:"read_to_me",label_ar:"🔊 إنت اقرأ"},{id:"read_myself",label_ar:"📖 أنا بقرأ"},{id:"both",label_ar:"🔊📖 الاثنين"}]});
add(d,"F",undefined,false,"auto","F3","أيّ كلمة أسهل تقرأها؟",[],{type:"size_pick",save:"text_size",options:[24,32,40].map(size=>({id:String(size),label_ar:"مَرْحَبًا",size}))});
add(d,"F",undefined,false,"auto","F4","بتحب تحكي ولّا تكتب؟",[],{type:"preference",save:"input",options:[{id:"voice",label_ar:"🎤 أحكي"},{id:"keyboard",label_ar:"⌨️ أكتب"}]});
const l=bank("learning_difficulties",[["A","الأنماط",undefined,true,"auto"],["B","الأرقام",undefined,true,"auto"],["C","القراءة",undefined,true,"optional"],["D","الذاكرة",undefined,true,"auto"],["E","التعليمات",undefined,true,"auto"],["F","نتعلّم من مثال",undefined,true,"auto"],["G","عنّي",undefined,false,"auto"]]);
[
 ["A1","🔴🔵🔴🔵🔴 ❓",["🔵","🔴","🟢"]],
 ["A2","🍎🍎🍌🍎🍎🍌🍎 ❓",["🍎","🍌","🍇"]],
 ["A3","⬆️➡️⬇️⬅️⬆️➡️ ❓",["⬇️","⬆️","⬅️"]],
 ["A4","⭐ · ⭐⭐ · ⭐⭐⭐ · ❓",["⭐⭐⭐⭐","⭐⭐","⭐⭐⭐⭐⭐"]],
].forEach(([id,shown,v])=>add(l,"A","reasoning",true,"auto",id as string,"شو بيجي بعدين؟",v as string[],{shown:shown as string}));
[
 ["B1","كم تفاحة؟ 🍎🍎🍎🍎🍎",["5","4","6"]],
 ["B2","اضغط على الرقم 17",["17","71","14"]],
 ["B3","3 + 4 = ؟",["7","6","8"],"🟡🟡🟡 + 🟡🟡🟡🟡"],
 ["B4","مع ليلى 9 بالونات 🎈، طار منهم 3. كم ضلّ معها؟",["6","5","12"]],
 ["B5","25 + 13 = ؟",["38","37","48"]],
].forEach(([id,p,v,shown])=>add(l,"B","numbers",true,"auto",id as string,p as string,v as string[],{shown:shown as string|undefined}));
[
 ["C1","شَمْس","اضغط على الصورة",["☀️","🌙","⭐"]],
 ["C2","الوَلَدُ يَأْكُلُ تُفّاحَة.","اضغط على الصورة",["🧒🍎","🧒⚽","👧🍎"]],
 ["C3","ذَهَبَ سامي إِلى السّوقِ وَاشْتَرى خُبْزًا.","ماذا اشْتَرى سامي؟",["🍞","🥛","🍌"]],
 ["C4","كانَتِ السَّماءُ تُمْطِرُ. أَخَذَتْ هِنْدُ المِظَلَّةَ قَبْلَ أَنْ تَخْرُج.","لِماذا أَخَذَتْ هِنْدُ المِظَلَّة؟",["لِأَنَّ السَّماءَ تُمْطِر ☔","لِأَنَّها تُحِبُّ اللَّوْنَ الأَحْمَر","لِأَنَّ الجَوَّ حارّ"]],
].forEach(([id,shown,p,v])=>add(l,"C","reading",true,"optional",id as string,p as string,v as string[],{shown:shown as string}));
[
 ["D1",["🐶","🚗"],["🍎","⭐","🏠","🎈"]],
 ["D2",["⭐","🍎","🏠"],["🐶","🚗","🎈"]],
 ["D3",["🐟","🌙","⚽","🎈"],["🍎","🏠"]],
].forEach(([id,seq,dis])=>add(l,"D","memory",true,"auto",id as string,"شوف الصور منيح. رح يختفوا، وبعدين اضغط عليهم بالترتيب.",[],{type:"sequence_memory",sequence:seq as string[],options:[...(seq as string[]),...(dis as string[])].map(x=>({id:x,emoji:x}))}));
[
 ["E1","اضغط على النجمة",["⭐"]],
 ["E2","اضغط على المربع الأزرق، بعدين على القلب",["🟦","💛"]],
 ["E3","اضغط على الدائرة الخضراء، بعدين المثلث، بعدين الدائرة الحمراء",["🟢","🔺","🔴"]],
].forEach(([id,p,seq])=>add(l,"E","instructions",true,"auto",id as string,p as string,[],{type:"ordered_taps",sequence:seq as string[],options:["🔴","⭐","🟦","🔺","🟢","💛"].map(x=>({id:x,emoji:x}))}));
[
 ["F1","كل 🖐️ فيها 5 أصابع. 🖐️🖐️ = 10","🖐️🖐️🖐️ = ؟",["15","10","3"]],
 ["F2","مُعَلِّم ← مُعَلِّمون · لاعِب ← لاعِبون","مُهَنْدِس ← ؟",["مُهَنْدِسون","مُهَنْدِس","مُهَنْدِسَة"]],
 ["F3","2 ← 4 · 3 ← 6 · 5 ← 10","4 ← ؟",["8","6","9"]],
].forEach(([id,example,p,v])=>add(l,"F","learns_from_example",true,"auto",id as string,p as string,v as string[],{example:example as string}));
add(l,"G",undefined,false,"optional","G1","شو بتحب؟ اختار لحد ٣",[],{type:"multi_pick",options:interests,save:"interests"});
add(l,"G",undefined,false,"optional","G2","كيف بتحب نتعلّم؟",[],{type:"preference",save:"style",options:[{id:"pictures",label_ar:"🖼️ بالصور"},{id:"listen",label_ar:"🔊 أسمع"},{id:"read",label_ar:"📝 أقرأ"}]});
add(l,"G",undefined,false,"optional","G3","بتحب تحكي ولّا تكتب؟",[],{type:"preference",save:"input",options:[{id:"voice",label_ar:"🎤 أحكي"},{id:"keyboard",label_ar:"⌨️ أكتب"}]});
const a=bank("autism",[["P","🧡 أشياء بحبّها",undefined,false,"off"],["N","🔢 أرقام",undefined,true,"off"],["R","📖 كلمات",undefined,true,"optional"],["F","💬 شو قصدهم؟",undefined,false,"off"],["S","👥 قصص",undefined,false,"off"],["L","⚙️ كيف بحب أتعلّم",undefined,false,"off"]]);
add(a,"P",undefined,false,"off","P1","اختار الأشياء اللي بتحبّها. لحد ٣.",[],{type:"multi_pick",options:interests,save:"interests"});
add(a,"P",undefined,false,"off","P2","شو أكثر شي بتحبّه بالدنيا؟ (اكتب أو احكي، أو اضغط تخطّي)",[],{type:"free_text_optional",save:"favorite_thing"});
[
 ["N1","كم نجمة؟ ⭐⭐⭐⭐⭐⭐⭐",["7","6","8"]],
 ["N2","8 + 5 = ؟",["13","12","14"]],
 ["N3","عند خالد 12 قلم. أعطى أخته 5 أقلام. كم قلم ضلّ معه؟",["7","17","6"]],
 ["N4","3 × 4 = ؟",["12","7","34"]],
].forEach(([id,p,v])=>add(a,"N","numbers",true,"off",id as string,p as string,v as string[]));
[
 ["R1","قَمَر","اضغط على الصورة",["🌙","☀️","🌳"]],
 ["R2","البِنْتُ تَرْكَبُ الدَّرّاجَة.","اضغط على الصورة",["👧🚲","👧🚗","🧒🚲"]],
 ["R3","يَزْرَعُ جَدّي الزَّيْتونَ في الحَديقَة.","ماذا يَزْرَعُ جَدّي؟",["🫒","🍅","🌻"]],
 ["R4","نَسِيَ عَلِيٌّ مِعْطَفَهُ في البَيْت. كانَ الجَوُّ بارِدًا جِدًّا.","كَيْفَ شَعَرَ عَلِيّ؟",["🥶 بالبرد","🥵 بالحَرّ","😴 بالنُّعاس"]],
].forEach(([id,shown,p,v])=>add(a,"R","reading",true,"optional",id as string,p as string,v as string[],{shown:shown as string}));
[
 ["F1","قالت المعلّمة: «الوقت من ذهب.»",["الوقت مهم، ما لازم نضيّعه","الساعة مصنوعة من ذهب","رح نشتري ذهب"]],
 ["F2","قال أبو سامي: «سامي قلبه أبيض.»",["سامي طيّب","قلب سامي لونه أبيض","سامي بحب اللون الأبيض"]],
 ["F3","ليلى طارت من الفرح لمّا شافت هديّتها.",["ليلى فرحت كثير","ليلى طارت بالسما","ليلى خافت من الهديّة"]],
].forEach(([id,p,v])=>add(a,"F","figurative",false,"off",id as string,p as string,v as string[],{},["literal","literal"]));
add(a,"S","social_understanding",false,"off","S1","كيف شعر يوسف؟",["😢 حزين","😄 فرحان","😴 نعسان"],{shown:"وقع آيس كريم يوسف على الأرض."});
add(a,"S","social_understanding",false,"off","S2","ليش ريم أعطتها؟",["لأنها بدها تساعدها","لأنها ما بتحب السندويش","لأنّ المعلّمة زعلانة"],{shown:"ريم أعطت صاحبتها نصّ سندويشتها، لأنّ صاحبتها نسيت أكلها."});
for (const [id,p,save,opts] of [
 ["L1","بتحب Lumi يحكي:","reply_length",[["short","💬 جمل قصيرة"],["long","📄 أكثر"]]],
 ["L2","بتحب تجاوب:","answer_mode",[["tap","👆 أضغط على خيارات"],["text","⌨️ أكتب"],["voice","🎤 أحكي"]]],
 ["L3","الصوت:","sound",[["on","🔊 شغّال"],["off","🔇 مطفي"]]],
 ["L4","بتحب تعرف شو رح نعمل قبل ما نبدأ؟","show_plan",[["true","✅ أيوا"],["false","➖ مش مهم"]]],
] as const) add(a,"L",undefined,false,"off",id,p,[],{type:"preference",save,options:opts.map(([id,label_ar])=>({id,label_ar}))});
mkdirSync(resolve(root,"placement/items"),{recursive:true});
for(const b of [d,l,a]) {
  writeFileSync(resolve(root,"placement/items",`${b.test}.json`),JSON.stringify(b,null,2)+"\n");
  console.log(`${b.test}: ${b.sections.flatMap(s=>s.items).length} items`);
}
