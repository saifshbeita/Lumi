# Autism

Placement warm-up for Lumi's **autism mode**. Version 1.

**What it is:** a calm, predictable warm-up on first login. It finds the child's academic starting level, how literally they take language, what they love, and how they like to interact, so the tutor fits them from the first chat.

**What it is not:** a diagnosis or an assessment of autism. Many autistic kids are at or above grade level. This warm-up must **not** assume weakness. Scores are never shown to the child.

---

## 1. At a glance

| | |
|---|---|
| Ages | 6 to 12 |
| Language | Arabic (items), UI follows the AR/EN toggle |
| Length | about 19 items, 6 parts, about 7 to 9 minutes. **No time limit** |
| Kid-facing name | **"يلا نتعرّف!"**. Never "test" or "امتحان" |
| Answer method | Taps. One optional free text/voice answer |
| Scoring | Deterministic code. No AI involved |
| Digits | Western digits by default, config flag for ١، ٢، ٣ |

---

## 2. How it runs in autism mode

- **Visual schedule first.** Before anything starts, show the full plan:
  `1 🧡 أشياء بحبّها · 2 🔢 أرقام · 3 📖 كلمات · 4 💬 شو قصدهم؟ · 5 👥 قصص · 6 ⚙️ كيف بحب أتعلّم · ✅ خلصنا`
  The current part is highlighted. Show this same schedule again **between every part** with: «خلّصنا جزء {n}. هلّق: {next}.»
- Fixed layout. Question always in the same place, options always in the same place, button positions never move.
- **No animations, no transitions, no confetti, no sounds** unless the child turns sound on. Minimal yellow. Lumi image is static.
- Literal, short instructions. No idioms in the instructions themselves.
- Same neutral reaction every time, right or wrong: **"تمّ ✓"**. Never "wow!!", never right/wrong, never red.
- Every item has **"بدّي أتخطّى"** (skip). Counts as wrong. No penalty shown.
- Progress text: "سؤال 2 من 4" inside each part.
- **Response time is recorded but never used in scoring.**
- A "استراحة ⏸️" (break) button is always visible. Pausing saves progress.

### Stop rule
Parts 2 and 3: easy to hard, **2 wrong in a row** ends the part. Parts 4 and 5 always run in full (they are short). Parts 1 and 6 always run.

---

## 3. Items

Correct option first (✅). **Shuffle options in the UI** (shuffle once and keep that order if the child redoes it, predictability matters).

### 1. Things I like (not scored, runs first so the start is positive)
| id | Lumi says | options | saves to |
|---|---|---|---|
| P1 | اختار الأشياء اللي بتحبّها. لحد ٣. | 12 shared interest tiles | `interests` |
| P2 | شو أكثر شي بتحبّه بالدنيا؟ (اكتب أو احكي، أو اضغط تخطّي) | free text or voice, optional | `favorite_thing`, `answered_open` (true/false) |

**Shared interest tiles:** 🐶 حيوانات, 🦖 ديناصورات, 🚗 سيارات, 🚂 قطارات, 🚀 الفضاء, ⚽ كرة قدم, 🎨 رسم, 🎮 ألعاب, 🧱 بناء وتركيب, 🌍 بلاد وخرائط, 🔢 أرقام, 🎵 موسيقى.

### 2. Numbers (domain: `numbers`)
| id | Lumi says | options |
|---|---|---|
| N1 | كم نجمة؟ ⭐⭐⭐⭐⭐⭐⭐ | ✅ 7 / 6 / 8 |
| N2 | 8 + 5 = ؟ | ✅ 13 / 12 / 14 |
| N3 | عند خالد 12 قلم. أعطى أخته 5 أقلام. كم قلم ضلّ معه؟ | ✅ 7 / 17 / 6 |
| N4 | 3 × 4 = ؟ | ✅ 12 / 7 / 34 |

### 3. Words (domain: `reading`)
Text large, full tashkeel. 🔊 available only if sound is on (not scored as supported here, we care about level, not independence).
| id | shown | question | options |
|---|---|---|---|
| R1 | قَمَر | اضغط على الصورة | ✅ 🌙 / ☀️ / 🌳 |
| R2 | البِنْتُ تَرْكَبُ الدَّرّاجَة. | اضغط على الصورة | ✅ 👧🚲 / 👧🚗 / 🧒🚲 |
| R3 | يَزْرَعُ جَدّي الزَّيْتونَ في الحَديقَة. | ماذا يَزْرَعُ جَدّي؟ | ✅ 🫒 / 🍅 / 🌻 |
| R4 | نَسِيَ عَلِيٌّ مِعْطَفَهُ في البَيْت. كانَ الجَوُّ بارِدًا جِدًّا. | كَيْفَ شَعَرَ عَلِيّ؟ | ✅ 🥶 بالبرد / 🥵 بالحَرّ / 😴 بالنُّعاس |

### 4. What do they mean? (domain: `figurative`)
Lumi says: «الناس أحيانًا بيحكوا جمل. اختار شو قصدهم.»
| id | sentence | options |
|---|---|---|
| F1 | قالت المعلّمة: «الوقت من ذهب.» | ✅ الوقت مهم، ما لازم نضيّعه / الساعة مصنوعة من ذهب / رح نشتري ذهب |
| F2 | قال أبو سامي: «سامي قلبه أبيض.» | ✅ سامي طيّب / قلب سامي لونه أبيض / سامي بحب اللون الأبيض |
| F3 | ليلى طارت من الفرح لمّا شافت هديّتها. | ✅ ليلى فرحت كثير / ليلى طارت بالسما / ليلى خافت من الهديّة |

Log which wrong option was picked: all wrong options here are the **literal** reading.

### 5. Stories about people (domain: `social_understanding`)
| id | story | question | options |
|---|---|---|---|
| S1 | وقع آيس كريم يوسف على الأرض. | كيف شعر يوسف؟ | ✅ 😢 حزين / 😄 فرحان / 😴 نعسان |
| S2 | ريم أعطت صاحبتها نصّ سندويشتها، لأنّ صاحبتها نسيت أكلها. | ليش ريم أعطتها؟ | ✅ لأنها بدها تساعدها / لأنها ما بتحب السندويش / لأنّ المعلّمة زعلانة |

### 6. How I like to learn (not scored)
Lumi says: «هون ما في جواب صح وغلط. اختار اللي بريحك.»
| id | Lumi says | options | saves to |
|---|---|---|---|
| L1 | بتحب Lumi يحكي: | 💬 جمل قصيرة / 📄 أكثر | `preferences.reply_length` |
| L2 | بتحب تجاوب: | 👆 أضغط على خيارات / ⌨️ أكتب / 🎤 أحكي | `preferences.answer_mode` |
| L3 | الصوت: | 🔊 شغّال / 🔇 مطفي | `preferences.sound` |
| L4 | بتحب تعرف شو رح نعمل قبل ما نبدأ؟ | ✅ أيوا / ➖ مش مهم | `preferences.show_plan` |

Final screen, always the same: «خلصنا ✅. شكرًا! هلّق بنقدر نبلّش نتعلّم سوا.»

---

## 4. Scoring and ranking

### Per item
correct = 1. wrong, skipped, not reached = 0.

### Level per domain (same thresholds in all 3 tests)
`pct = correct / items in domain`

| pct | level | name |
|---|---|---|
| under 30% | 1 | Starting |
| 30% to 54% | 2 | Building |
| 55% to 84% | 3 | Ready |
| 85% and up | 4 | Strong |

Two-item domains: 0 = 1, 1 = 2, 2 = 4. Three-item domains: 0 = 1, 1 = 2, 2 = 3, 3 = 4.

| domain | items |
|---|---|
| `numbers` | N1 to N4 |
| `reading` | R1 to R4 |
| `figurative` | F1 to F3 |
| `social_understanding` | S1 to S2 |

### Band (sets starting difficulty of content)
`avg = mean(numbers, reading)`: under 1.75 = `starter`, 1.75 to 2.74 = `builder`, 2.75+ = `explorer`.

### Flags
| flag | rule | meaning |
|---|---|---|
| `academically_ready` | mean(numbers, reading) ≥ 3 | **Hidden strength.** Academically capable. Do not oversimplify content, adapt the format only |
| `literal_language` | figurative ≤ 2 | Takes language literally |
| `explain_feelings` | social_understanding ≤ 2 | Name feelings and reasons explicitly in stories |
| `prefers_choices` | answer_mode = tap OR answered_open = false | Offer 2 to 3 options with every question |
| `deep_interest` | favorite_thing is not empty | Has a strong favorite topic to build examples on |

### Signals (stored, not scored)
`median_response_sec`, `skips`, `breaks`, `duration_sec`.

---

## 5. Output (saved to `placements.result`)

```json
{
  "test": "autism",
  "version": 1,
  "completed_at": "2026-10-11T09:30:00Z",
  "levels": { "numbers": 4, "reading": 3, "figurative": 1, "social_understanding": 2 },
  "band": "explorer",
  "flags": ["academically_ready", "literal_language", "explain_feelings", "prefers_choices", "deep_interest"],
  "interests": ["trains", "maps"],
  "favorite_thing": "قطارات الشحن",
  "preferences": { "reply_length": "short", "answer_mode": "tap", "sound": "off", "show_plan": true },
  "signals": { "median_response_sec": 18, "skips": 1, "breaks": 1, "duration_sec": 640 }
}
```

---

## 6. Tutor rules (how the result changes Lumi)

### Always in autism mode (whatever the result)
- Literal language only. No idioms, metaphors, sarcasm or jokes based on double meaning.
- Every session starts with a plan: «اليوم رح نعمل: 1) ... 2) ... 3) ...» and ends with the same phrase: «خلصنا ✅».
- Before any change, announce it: «هلّق رح نغيّر لـ ...».
- Same feedback phrase every time. Calm tone. No exclamation marks overload, no random emoji.
- One question per message.

### From the result
| condition | Lumi does |
|---|---|
| `reply_length` = short | Max 2 short sentences per message |
| `reply_length` = long | Max 4 short sentences per message |
| `academically_ready` | Teach at their real level. Give challenge. Don't use baby examples |
| `literal_language` | If a text the child reads contains an idiom, explain it directly: «هاي جملة معناها: ...» |
| figurative ≥ 3 | Can teach common idioms as a topic, always with the literal meaning written next to it |
| `explain_feelings` | In stories, state feelings and reasons plainly: «يوسف حزين، لأنّ الآيس كريم وقع.» |
| `prefers_choices` | Every question comes with 2 to 3 tap options. Open questions only if the child starts one |
| `deep_interest` / interests | Use `favorite_thing` in most examples (math with trains, reading about trains) |
| `sound` = off | Do not auto-play audio |
| band | Start content at the band's level (same content table as learning difficulties: 1 counting and single words, 2 within 20 and sentences, 3 within 100 and paragraphs, 4 two-step and short stories) |

---

## 7. Context block template (injected into the system prompt)

```
LEARNER CONTEXT (from the warm-up on {date}. A starting point, not a diagnosis. Never mention levels, scores, flags or the condition to the child.)
Mode: autism. Band: {band}.
Levels (1 to 4): numbers {numbers}, reading {reading}, understanding non-literal sentences {figurative}, understanding feelings in stories {social_understanding}.
Strength: {strength_line}
Favorite thing: {favorite_thing}. Interests: {interests}
Preferences: replies {reply_length}, answers by {answer_mode}, sound {sound}.
Rules for you:
{the "always" rules + one line per rule from section 6 that applies}
```

`strength_line`: if `academically_ready` then "Academically capable. Adapt the format, not the difficulty." Else list domains at level 3+.

---

## 8. Profile insights to seed (adult dashboard)

On completion, replace old insights with `source = placement`. Wording stays neutral and non-clinical.

| domain | strength (level ≥ 3) | weakness (level ≤ 2) |
|---|---|---|
| numbers | Strong with numbers / قوي بالأرقام | Needs practice with numbers / يحتاج تدريب على الأرقام |
| reading | Reads and understands well / يقرأ ويفهم جيدًا | Needs support with reading / يحتاج دعم بالقراءة |
| figurative | Understands non-literal sentences / يفهم الجمل غير الحرفية | Takes sentences literally / يفهم الجمل بشكل حرفي |
| social_understanding | Understands feelings in stories / يفهم المشاعر في القصص | Benefits from feelings being named clearly / يستفيد من تسمية المشاعر بوضوح |

**Needs** (from flags):
- `academically_ready`: "Capable academically. Adapt the format, not the level." / "قادر أكاديميًا. غيّر الطريقة مش المستوى."
- `prefers_choices`: "Prefers answering with choices" / "يفضّل الإجابة من خيارات"
- `deep_interest`: "Loves {favorite_thing}. Use it in lessons." / "بحب {favorite_thing}. استخدمه بالدروس."
