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
- **Random word** card for quick review
- Light and dark theme

## Files
| File | Contents |
|---|---|
| `index.html` | Home page: topic list, TOPIK filter, search |
| `topic.html` | Word list for one topic, with level buttons A1–C2 |
| `random.js` | Random-word card |
| `data.js` | Words: part of speech, English meaning, Uzbek translation, example sentence |
| `examples.js` | Korean example sentences for levels A1–C2 |
| `examples_uz.js` | Uzbek translations of the example sentences |
| `test.js` | jsdom tests (`node test.js`) |

## Run locally
This is a static site. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
