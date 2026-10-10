# Dyslexia

Placement warm-up for Lumi's **dyslexia mode**. Version 1.

**What it is:** a short, playful warm-up the child does on first login. It finds their starting level and their strengths so the tutor adapts from the very first chat.

**What it is not:** a diagnosis or a clinical assessment. The condition is already set by the adult from a specialist's assessment. Scores are never shown to the child.

---

## 1. At a glance

| | |
|---|---|
| Ages | 6 to 12 |
| Language | Arabic (items), UI follows the AR/EN toggle |
| Length | 25 items, 6 sections, about 8 to 10 minutes (stop rule makes it shorter) |
| Kid-facing name | **"يلا نتعرّف!"** (Let's get to know each other). Never "test", "exam" or "امتحان" |
| Answer method | Taps on big buttons only (pictures, letters, words). No speech scoring |
| Scoring | Deterministic code. No AI involved in scoring |

---

## 2. How it runs in dyslexia mode

- Every prompt is **read aloud automatically**. Big 🔊 replay button on every item, unlimited replays (count them).
- Max 3 options per item. Buttons min 72px tall. Letters and words at 40px+, Readex Pro, full tashkeel.
- Picture options in section A and E show **emoji only, no written label** (reading must not interfere).
- After every answer, the same neutral reaction for right and wrong: Lumi says **"شاطر! يلا التالي"**. Never show right/wrong. Never red.
- Every item has a **"مش متأكد 🤷"** button. Counts as wrong. No penalty shown.
- Progress: 6 dots at the top, one per section.
- **Exception:** in E3 and E4 the passage is shown but **NOT read aloud** (this is the only place we measure reading comprehension). The question itself is still read aloud.

### Stop rule
Items inside a section go easy to hard. After **2 wrong in a row** (skip = wrong), stop that section, mark the remaining items wrong, move on. Section F always runs.

---

## 3. Items

Correct option is listed first (✅). **Shuffle options in the UI.**
`tag` = what kind of mistake a wrong option represents. Used for error patterns.

### A. Sounds (domain: `phonology`)
| id | Lumi says | options |
|---|---|---|
| A1 | أيّ صورة تبدأ بصوت «سـ»؟ | ✅ 🐟 (سمكة) / 🚪 (باب) / 🌙 (قمر) |
| A2 | أيّ كلمة آخرها مثل «نار»؟ | ✅ 🏠 (دار) / 🐕 (كلب) / ☀️ (شمس) |
| A3 | كم مقطع في كلمة «دَجاجة» 🐔؟ | ✅ 👏👏👏 / 👏👏 / 👏 |
| A4 | اسمع: «قـ... طّـ... ة». شو الكلمة؟ (sounds spoken separately, with pauses) | ✅ 🐱 (قطّة) / 🌙 (قمر) / 🚂 (قطار) |

### B. Letters (domain: `letters`)
Lumi says the letter name and its sound, e.g. "ثاء، ثَـ".
| id | Lumi says | options | wrong tags |
|---|---|---|---|
| B1 | اضغط على حرف «م» | ✅ م / ب / ل | shape |
| B2 | اضغط على حرف «ث» | ✅ ث / ت / ب | dots |
| B3 | اضغط على حرف «خ» | ✅ خ / ح / ج | dots |
| B4 | اضغط على «ت» في وسط الكلمة | ✅ ـتـ / ـنـ / ـيـ | dots, position |
| B5 | اضغط على «غ» في أول الكلمة | ✅ غـ / عـ / فـ | dots, position |

### C. Tashkeel (domain: `diacritics`)
| id | Lumi says | options | wrong tags |
|---|---|---|---|
| C1 | اسمع: «بَ» | ✅ بَ / بُ / بِ | harakat |
| C2 | اسمع: «سِ» | ✅ سِ / سَ / سُ | harakat |
| C3 | اسمع: «كِتابٌ» | ✅ كِتابٌ / كِتابًا / كِتابٍ | tanween |
| C4 | اسمع: «دَرَّسَ» | ✅ دَرَّسَ / دَرَسَ / دُرِسَ | shadda |

### D. Words (domain: `word_reading`)
Lumi says the word. Child taps the written word.
| id | Lumi says | options | wrong tags |
|---|---|---|---|
| D1 | «بَيْت» | ✅ بَيْت / بِنْت / ثَبَت | dots |
| D2 | «جَمَل» | ✅ جَمَل / حَمَل / جَبَل | dots / shape |
| D3 | «كَتَبَ» | ✅ كَتَبَ / كَبَتَ / بَكَتَ | order |
| D4 | «مدرسة» (shown **without** tashkeel) | ✅ مدرسة / مدسرة / مرسدة | order |

### E. Understanding
**E1 to E2, listening (domain: `listening`).** Lumi reads the story aloud. Text is hidden.
> ذَهَبَتْ سَلْمى مَعَ أَبيها إِلى البَحْر. بَنَتْ سَلْمى قَلْعَةً مِنَ الرَّمْل. جاءَتْ مَوْجَةٌ كَبيرَةٌ وَهَدَمَتِ القَلْعَة. ضَحِكَتْ سَلْمى وَبَنَتْ قَلْعَةً جَديدَة.

| id | question (audio) | options |
|---|---|---|
| E1 | أين ذهبت سلمى؟ | ✅ 🌊 / 🏫 / 🌳 |
| E2 | شو عملت سلمى بعد ما الموجة هدمت القلعة؟ | ✅ 🏰 (بنت قلعة جديدة) / 😢 (بكت) / 🏠 (رجعت عالبيت) |

**E3 to E4, reading (domain: `reading_comp`).** Passage shown in text, large, full tashkeel, **no audio for the passage, replay button hidden for it**.
> كانَ لِعُمَرَ قِطٌّ صَغيرٌ اسْمُهُ نَمِر. نَمِرٌ يُحِبُّ الحَليبَ، وَيَنامُ عَلى الكَنَبَة.

| id | question (audio OK) | options |
|---|---|---|
| E3 | شو بحب نمر؟ | ✅ 🥛 / 🐟 / 🍎 |
| E4 | وين بنام نمر؟ | ✅ 🛋️ / 🛏️ / 🌳 |

### F. About me (no right answers, not scored)
| id | Lumi says | options | saves to |
|---|---|---|---|
| F1 | شو بتحب؟ اختار لحد ٣ | 12 shared interest tiles (see below) | `interests` |
| F2 | بتحب أقرأ لك أنا، ولّا تقرأ إنت؟ | 🔊 إنت اقرأ / 📖 أنا بقرأ / 🔊📖 الاثنين | `preferences.reading` |
| F3 | أيّ كلمة أسهل تقرأها؟ | «مَرْحَبًا» at 24px / 32px / 40px | `preferences.text_size` |
| F4 | بتحب تحكي ولّا تكتب؟ | 🎤 أحكي / ⌨️ أكتب | `preferences.input` |

**Shared interest tiles (same in all 3 tests):** 🐶 حيوانات, 🦖 ديناصورات, 🚗 سيارات, 🚂 قطارات, 🚀 الفضاء, ⚽ كرة قدم, 🎨 رسم, 🎮 ألعاب, 🧱 بناء وتركيب, 🌍 بلاد وخرائط, 🔢 أرقام, 🎵 موسيقى.

---

## 4. Scoring and ranking

### Per item
correct = 1. wrong, skipped, or not reached (stop rule) = 0.

### Level per domain (same thresholds in all 3 tests)
`pct = correct / items in domain`

| pct | level | name |
|---|---|---|
| under 30% | 1 | Starting |
| 30% to 54% | 2 | Building |
| 55% to 84% | 3 | Ready |
| 85% and up | 4 | Strong |

Two-item domains: 0 correct = 1, 1 correct = 2, 2 correct = 4.

| domain | items |
|---|---|
| `phonology` | A1 to A4 |
| `letters` | B1 to B5 |
| `diacritics` | C1 to C4 |
| `word_reading` | D1 to D4 |
| `listening` | E1 to E2 |
| `reading_comp` | E3 to E4 |

### Band (sets starting difficulty)
`avg = mean(letters, diacritics, word_reading, reading_comp)`

| avg | band |
|---|---|
| under 1.75 | `starter` |
| 1.75 to 2.74 | `builder` |
| 2.75 and up | `explorer` |

### Flags
| flag | rule | meaning |
|---|---|---|
| `understands_more_than_reads` | listening ≥ 3 AND (listening − reading_comp ≥ 2 OR listening − word_reading ≥ 2) | **Hidden strength.** Thinks and understands well, reading is the barrier |
| `similar_letters` | any wrong answer tagged `dots` | Mixes letters that differ by dots |
| `letter_order` | any wrong answer tagged `order` | Mixes letter order inside words |
| `needs_tashkeel` | diacritics ≤ 2 | Needs full tashkeel and harakat practice |
| `sound_first` | phonology ≤ 2 | Start with sound games before letters |
| `relies_on_audio` | audio replays ≥ 8 | Always read everything aloud |
| `slow_pace` | median response time > 15s | Give more time, fewer items per message |

### Error patterns
For every wrong tap in B, C, D, save `"target↔picked"`, e.g. `"ث↔ت"`, `"ـتـ↔ـنـ"`, `"كِتابٌ↔كِتابًا"`, `"كَتَبَ↔كَبَتَ"`. Keep the 3 most frequent.

### Signals
`median_response_sec`, `audio_replays`, `skips`, `duration_sec`.

---

## 5. Output (saved to `placements.result`)

```json
{
  "test": "dyslexia",
  "version": 1,
  "completed_at": "2026-10-11T09:12:00Z",
  "levels": { "phonology": 3, "letters": 2, "diacritics": 2, "word_reading": 2, "listening": 4, "reading_comp": 1 },
  "band": "builder",
  "flags": ["understands_more_than_reads", "similar_letters", "needs_tashkeel"],
  "error_patterns": ["ث↔ت", "ـتـ↔ـنـ", "كَتَبَ↔كَبَتَ"],
  "interests": ["football", "space"],
  "preferences": { "reading": "read_to_me", "text_size": 40, "input": "voice" },
  "signals": { "median_response_sec": 9, "audio_replays": 11, "skips": 2, "duration_sec": 520 }
}
```

---

## 6. Tutor rules (how the result changes Lumi)

| condition | Lumi does |
|---|---|
| word_reading = 1 | Written text per reply: max 3 words (one key word, big). Everything else by voice |
| word_reading = 2 | Max 1 short sentence (≤ 8 words) of text per reply |
| word_reading = 3 | Max 2 short sentences of text |
| word_reading = 4 | Max 3 short sentences of text |
| always (dyslexia mode) | Full tashkeel on every Arabic word shown. No italics. Short lines |
| `understands_more_than_reads` | Keep **ideas and questions at the child's age**. Simplify the reading load, never the thinking. Ask "why" and "how" questions the child can answer by voice. Praise thinking |
| `similar_letters` / error_patterns | Pick one pair per session. Show both letters big, say both sounds, give 3 tap-the-right-one turns. Never more than one pair at a time |
| `letter_order` | When showing a new word, split it into letters first, then join |
| `needs_tashkeel` | Practice harakat inside real words, one haraka at a time |
| `sound_first` | Before letter or word tasks, do a 1 to 2 turn sound game (first sound, rhyme, blending) |
| `relies_on_audio` | Never ask the child to read something without offering 🔊 |
| `slow_pace` | One question per message. Never rush. No "quick" wording |
| band `starter` | Start with letters and short words |
| band `builder` | Start with short voweled words and short sentences |
| band `explorer` | Start with short voweled paragraphs read together |
| interests | Use them in examples and word choices (e.g. football words for letter practice) |
| `preferences.input` | Default input on the chat screen (voice or keyboard) |

---

## 7. Context block template (injected into the system prompt)

```
LEARNER CONTEXT (from the warm-up on {date}. A starting point, not a diagnosis. Never mention levels, scores, flags or the condition to the child.)
Mode: dyslexia. Band: {band}.
Levels (1 to 4): sounds {phonology}, letters {letters}, tashkeel {diacritics}, word reading {word_reading}, listening {listening}, reading comprehension {reading_comp}.
Strength: {strength_line}
Practice targets: {error_patterns}
Interests: {interests}
Rules for you:
{one line per tutor rule from section 6 that applies}
```

`strength_line`: if `understands_more_than_reads` then "Understands much more than they can read. Keep ideas at their age, reduce only the reading load." Else list the domains at level 3+.

---

## 8. Profile insights to seed (adult dashboard)

On completion, replace old insights with `source = placement`.

| domain | strength (level ≥ 3) | weakness (level ≤ 2) |
|---|---|---|
| phonology | Hears and plays with sounds in words / يميّز الأصوات في الكلمات | Needs practice hearing sounds in words / يحتاج تدريب على تمييز الأصوات |
| letters | Recognizes letters, including similar ones / يميّز الحروف حتى المتشابهة | Mixes letters that differ by dots ({pairs}) / يخلط بين الحروف المتشابهة بالنقاط ({pairs}) |
| diacritics | Reads harakat and tashkeel / يقرأ الحركات والتشكيل | Needs practice with tashkeel / يحتاج تدريب على التشكيل |
| word_reading | Reads short words accurately / يقرأ الكلمات القصيرة بدقة | Reading single words is still hard / قراءة الكلمات ما زالت صعبة |
| listening | Understands stories well when read aloud / يفهم القصص جيدًا عند سماعها | Needs support understanding stories / يحتاج دعم في فهم القصص |
| reading_comp | Understands what they read / يفهم ما يقرأ | Understanding written text is hard / فهم النص المكتوب صعب |

**Needs** (from flags):
- `understands_more_than_reads`: "Understands more than they can read. Use audio, keep ideas at their age." / "يفهم أكثر مما يقرأ. استخدم الصوت وحافظ على مستوى الأفكار المناسب لعمره."
- `similar_letters`: "Practice similar letters: {pairs}" / "تدريب على الحروف المتشابهة: {pairs}"
- `slow_pace`: "Needs extra time per question" / "يحتاج وقت إضافي لكل سؤال"
