# Learning Difficulties

Placement warm-up for Lumi's **learning difficulties mode** (slow learners). Version 1.

**What it is:** a short warm-up on first login that finds the child's starting level, how much they can hold in one step, and where their thinking is stronger than their school skills.

**What it is not:** a diagnosis, an IQ test, or a clinical assessment. Scores are never shown to the child.

---

## 1. At a glance

| | |
|---|---|
| Ages | 6 to 12 |
| Language | Arabic (items), UI follows the AR/EN toggle |
| Length | 25 items, 7 sections, about 8 to 10 minutes |
| Kid-facing name | **"يلا نتعرّف!"**. Never "test" or "امتحان" |
| Answer method | Taps only |
| Scoring | Deterministic code. No AI involved |
| Digits | Western digits (1, 2, 3) by default. Config flag to switch to ١، ٢، ٣ if the school uses them |

---

## 2. How it runs in learning difficulties mode

- **One item per screen.** Child taps an answer, then a big **"التالي"** button appears. No auto-advance.
- Question text on screen plus 🔊 that plays it. Audio auto-plays in sections A, B, D, E, F.
- In section C (reading) audio does **not** auto-play. A 🔊 "اسمعها" button exists. If the child uses it and answers correctly, the item scores **0.5** (supported).
- Same neutral reaction for right and wrong: **"أحسنت! خلّينا نكمّل"**. Never show right/wrong. Never red.
- Every item has **"مش متأكد 🤷"**. Counts as wrong.
- Progress: one dot per section, the current dot is filled.

### Stop rule
Easy to hard inside each section. **2 wrong in a row** stops the section, remaining items count as wrong. Section G always runs.

---

## 3. Items

Correct option first (✅). **Shuffle options in the UI.**

### A. Patterns (domain: `reasoning`, non-verbal)
Lumi says: «شو بيجي بعدين؟»
| id | shown | options |
|---|---|---|
| A1 | 🔴🔵🔴🔵🔴 ❓ | ✅ 🔵 / 🔴 / 🟢 |
| A2 | 🍎🍎🍌🍎🍎🍌🍎 ❓ | ✅ 🍎 / 🍌 / 🍇 |
| A3 | ⬆️➡️⬇️⬅️⬆️➡️ ❓ | ✅ ⬇️ / ⬆️ / ⬅️ |
| A4 | ⭐ · ⭐⭐ · ⭐⭐⭐ · ❓ | ✅ ⭐⭐⭐⭐ / ⭐⭐ / ⭐⭐⭐⭐⭐ |

### B. Numbers (domain: `numbers`)
| id | Lumi says | options |
|---|---|---|
| B1 | كم تفاحة؟ 🍎🍎🍎🍎🍎 | ✅ 5 / 4 / 6 |
| B2 | اضغط على الرقم 17 | ✅ 17 / 71 / 14 |
| B3 | 3 + 4 = ؟ (shown with 🟡🟡🟡 + 🟡🟡🟡🟡) | ✅ 7 / 6 / 8 |
| B4 | مع ليلى 9 بالونات 🎈، طار منهم 3. كم ضلّ معها؟ | ✅ 6 / 5 / 12 |
| B5 | 25 + 13 = ؟ | ✅ 38 / 37 / 48 |

### C. Reading (domain: `reading`)
Text shown large with full tashkeel. 🔊 optional (supported = 0.5).
| id | shown | question | options |
|---|---|---|---|
| C1 | شَمْس | اضغط على الصورة | ✅ ☀️ / 🌙 / ⭐ |
| C2 | الوَلَدُ يَأْكُلُ تُفّاحَة. | اضغط على الصورة | ✅ 🧒🍎 / 🧒⚽ / 👧🍎 |
| C3 | ذَهَبَ سامي إِلى السّوقِ وَاشْتَرى خُبْزًا. | ماذا اشْتَرى سامي؟ | ✅ 🍞 / 🥛 / 🍌 |
| C4 | كانَتِ السَّماءُ تُمْطِرُ. أَخَذَتْ هِنْدُ المِظَلَّةَ قَبْلَ أَنْ تَخْرُج. | لِماذا أَخَذَتْ هِنْدُ المِظَلَّة؟ | ✅ لِأَنَّ السَّماءَ تُمْطِر ☔ / لِأَنَّها تُحِبُّ اللَّوْنَ الأَحْمَر / لِأَنَّ الجَوَّ حارّ |

### D. Memory (domain: `memory`)
Lumi says: «شوف الصور منيح. رح يختفوا، وبعدين اضغط عليهم بالترتيب.»
Show the sequence in a row for `count × 1.5` seconds, hide it, then show a 6-tile grid (the targets + distractors, shuffled). Correct only if the exact order is tapped.
| id | sequence | distractors in grid |
|---|---|---|
| D1 | 🐶 🚗 | 🍎 ⭐ 🏠 🎈 |
| D2 | ⭐ 🍎 🏠 | 🐶 🚗 🎈 |
| D3 | 🐟 🌙 ⚽ 🎈 | 🍎 🏠 |

### E. Instructions (domain: `instructions`)
Grid of 6 shapes: 🔴 ⭐ 🟦 🔺 🟢 💛 (fixed positions).
Instruction is spoken and shown as text **only while the audio plays**, then the text hides. One replay allowed. If replay is used and the answer is correct, score 0.5. Correct only if the exact sequence is tapped.
| id | Lumi says | correct taps |
|---|---|---|
| E1 | اضغط على النجمة | ⭐ |
| E2 | اضغط على المربع الأزرق، بعدين على القلب | 🟦 💛 |
| E3 | اضغط على الدائرة الخضراء، بعدين المثلث، بعدين الدائرة الحمراء | 🟢 🔺 🔴 |

### F. Learn from an example (domain: `learns_from_example`)
Show a worked example of something new, then one try.
| id | example shown | question | options |
|---|---|---|---|
| F1 | كل 🖐️ فيها 5 أصابع. 🖐️🖐️ = 10 | 🖐️🖐️🖐️ = ؟ | ✅ 15 / 10 / 3 |
| F2 | مُعَلِّم ← مُعَلِّمون · لاعِب ← لاعِبون | مُهَنْدِس ← ؟ | ✅ مُهَنْدِسون / مُهَنْدِس / مُهَنْدِسَة |
| F3 | 2 ← 4 · 3 ← 6 · 5 ← 10 | 4 ← ؟ | ✅ 8 / 6 / 9 |

### G. About me (not scored)
| id | Lumi says | options | saves to |
|---|---|---|---|
| G1 | شو بتحب؟ اختار لحد ٣ | 12 shared interest tiles | `interests` |
| G2 | كيف بتحب نتعلّم؟ | 🖼️ بالصور / 🔊 أسمع / 📝 أقرأ | `preferences.style` |
| G3 | بتحب تحكي ولّا تكتب؟ | 🎤 أحكي / ⌨️ أكتب | `preferences.input` |

**Shared interest tiles:** 🐶 حيوانات, 🦖 ديناصورات, 🚗 سيارات, 🚂 قطارات, 🚀 الفضاء, ⚽ كرة قدم, 🎨 رسم, 🎮 ألعاب, 🧱 بناء وتركيب, 🌍 بلاد وخرائط, 🔢 أرقام, 🎵 موسيقى.

---

## 4. Scoring and ranking

### Per item
correct = 1. supported correct (C with 🔊, E with replay) = 0.5. wrong, skipped, not reached = 0.

### Level per domain (same thresholds in all 3 tests)
`pct = points / items in domain`

| pct | level | name |
|---|---|---|
| under 30% | 1 | Starting |
| 30% to 54% | 2 | Building |
| 55% to 84% | 3 | Ready |
| 85% and up | 4 | Strong |

| domain | items |
|---|---|
| `reasoning` | A1 to A4 |
| `numbers` | B1 to B5 |
| `reading` | C1 to C4 |
| `memory` | D1 to D3 |
| `instructions` | E1 to E3 |
| `learns_from_example` | F1 to F3 |

### Band (sets starting difficulty of content)
`avg = mean(numbers, reading)`: under 1.75 = `starter`, 1.75 to 2.74 = `builder`, 2.75+ = `explorer`.

### Step size (sets how much Lumi gives per message)
`step = min(memory, instructions)`, a number from 1 to 4.

### Flags
| flag | rule | meaning |
|---|---|---|
| `reasons_beyond_school_level` | reasoning ≥ 3 AND reasoning − mean(numbers, reading) ≥ 1.5 | **Hidden strength.** Thinks better than their school skills show |
| `learns_fast_with_model` | learns_from_example ≥ 3 | Learns quickly when shown a worked example first |
| `short_memory` | memory ≤ 2 | Can't hold much at once. Repeat key info |
| `needs_audio_support` | 2+ supported answers in C | Offer 🔊 on reading tasks |
| `slow_pace` | median response time > 20s | More time, fewer items |

### Signals
`median_response_sec`, `audio_used`, `replays`, `skips`, `duration_sec`.

---

## 5. Output (saved to `placements.result`)

```json
{
  "test": "learning_difficulties",
  "version": 1,
  "completed_at": "2026-10-11T09:20:00Z",
  "levels": { "reasoning": 4, "numbers": 2, "reading": 2, "memory": 2, "instructions": 3, "learns_from_example": 3 },
  "band": "builder",
  "step": 2,
  "flags": ["reasons_beyond_school_level", "learns_fast_with_model", "short_memory"],
  "interests": ["cars", "animals"],
  "preferences": { "style": "pictures", "input": "voice" },
  "signals": { "median_response_sec": 14, "audio_used": 1, "replays": 1, "skips": 3, "duration_sec": 610 }
}
```

---

## 6. Tutor rules (how the result changes Lumi)

### Step size
| step | per message | check-in |
|---|---|---|
| 1 | 1 step, max 1 short sentence + 1 picture/emoji | after every step |
| 2 | 1 step, max 2 short sentences | every 2 steps |
| 3 | up to 2 steps | every 3 steps |
| 4 | up to 3 steps | every 4 steps |

Always the mode's "Next" flow: Lumi never sends the next step until the child taps Next or answers.

### Content level (from numbers / reading level)
| level | numbers start at | reading starts at |
|---|---|---|
| 1 | counting to 10 with objects | single words with pictures |
| 2 | add and subtract within 20 | short sentences |
| 3 | within 100, one-step word problems | short paragraphs |
| 4 | two-step problems, simple times tables | short stories with "why" questions |

### Flags
| flag | Lumi does |
|---|---|
| `reasons_beyond_school_level` | Don't treat the child as slow. Give puzzles and "how did you figure it out?" questions. Use visual reasoning to teach school skills |
| `learns_fast_with_model` | Always show a worked example first, then "your turn" |
| `short_memory` | Repeat the key fact in every step. Never say "remember what I said before". Recap in 1 line before a check-in |
| `needs_audio_support` | Offer 🔊 on every reading task |
| `slow_pace` | One question at a time. Never rush |
| band | Start content at the band's level, move up after 3 correct in a row, down after 2 wrong in a row |
| interests | Use them in word problems and examples (e.g. cars for counting) |
| `preferences.style` | pictures = add emoji/visuals every step. listen = shorter text, more 🔊 |

---

## 7. Context block template (injected into the system prompt)

```
LEARNER CONTEXT (from the warm-up on {date}. A starting point, not a diagnosis. Never mention levels, scores, flags or the condition to the child.)
Mode: learning difficulties. Band: {band}. Step size: {step}.
Levels (1 to 4): patterns {reasoning}, numbers {numbers}, reading {reading}, memory {memory}, following instructions {instructions}, learning from examples {learns_from_example}.
Strength: {strength_line}
Interests: {interests}
Rules for you:
{one line per tutor rule from section 6 that applies}
```

`strength_line`: if `reasons_beyond_school_level` then "Reasons better than their school skills show. Challenge their thinking, simplify only the steps." Else list domains at level 3+.

---

## 8. Profile insights to seed (adult dashboard)

On completion, replace old insights with `source = placement`.

| domain | strength (level ≥ 3) | weakness (level ≤ 2) |
|---|---|---|
| reasoning | Spots patterns and solves puzzles / يكتشف الأنماط ويحل الألغاز | Needs support with patterns / يحتاج دعم في الأنماط |
| numbers | Comfortable with numbers at their level / مرتاح مع الأرقام | Needs practice with basic numbers / يحتاج تدريب على الأرقام الأساسية |
| reading | Reads and understands short texts / يقرأ ويفهم نصوص قصيرة | Reading is still hard / القراءة ما زالت صعبة |
| memory | Remembers short sequences / يتذكر تسلسلات قصيرة | Holds only a little at once / يتذكر القليل في المرة الواحدة |
| instructions | Follows multi-step instructions / ينفّذ تعليمات من عدة خطوات | Needs one instruction at a time / يحتاج تعليمة وحدة كل مرة |
| learns_from_example | Learns fast from an example / يتعلم بسرعة من مثال | Needs more than one example / يحتاج أكثر من مثال |

**Needs** (from flags):
- `reasons_beyond_school_level`: "Thinks better than their grades show. Challenge them." / "تفكيره أقوى من مستواه الدراسي. اعطِه تحدّيات."
- `short_memory`: "Short steps, repeat key info" / "خطوات قصيرة مع تكرار المعلومة"
- `learns_fast_with_model`: "Show an example first" / "ابدأ بمثال"
