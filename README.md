# Korean Vocabulary — TOPIK I & II

Learn Korean vocabulary for the TOPIK I and TOPIK II exams, with English meanings, Uzbek translations and graded example sentences.

**Live site:** https://jabborov.github.io/korean_vocabulary/

## Vocabulary
| Level | Topics | Words |
|---|---|---|
| **TOPIK I** | **56** | **1,671** |
| **TOPIK II** | **89** | **2,662** |
| **Total** | **145** | **4,333** |

## Features
- **TOPIK I / TOPIK II filter** and a **search** across both levels: Korean words, English meanings and Uzbek translations
- **CEFR example sentences (A1–C2)** for every word, each with an **Uzbek translation**
- **Synonyms and opposites** for nouns, verbs, adjectives and adverbs (e.g. 남자 ↔ 여자, 열다 ↔ 닫다, 가깝다 ↔ 멀다, 빨리 ↔ 천천히), with Uzbek meanings
- **Random word** card for quick review
- Light and dark theme

## Files
| File | Contents |
|---|---|
| `index.html` | Home page: topic list, TOPIK filter, search |
| `topic.html` | Word list for one topic, with level buttons A1–C2 |
| `random.js` | Random-word card |
| `scroll.js` | Scroll-to-top / scroll-to-bottom buttons |
| `data.js` | Words: part of speech, English meaning, Uzbek translation, example sentence |
| `loader.js` | Loads a topic's file from `topics/` when a page needs it |
| `topics/NNNN.js` | One file per topic: example sentences (A1–C2), Uzbek translations, synonyms and opposites — generated, don't edit |
| `examples.js` | Source: Korean example sentences for levels A1–C2 |
| `examples_uz.js` | Source: Uzbek translations of the example sentences |
| `relations.js` | Source: synonyms and opposites of nouns, verbs, adjectives and adverbs, with Uzbek meanings |
| `build_topics.py` | Splits the three source files into `topics/` |
| `test.js` | jsdom tests (`node test.js`) |

## Run locally
This is a static site. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Editing the data
The pages load only `data.js` and the one `topics/NNNN.js` file for the topic being shown, not the large source files.
After changing `examples.js`, `examples_uz.js` or `relations.js`, regenerate the topic files:

```bash
python3 build_topics.py
```
