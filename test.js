const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
class Local extends ResourceLoader { fetch(url,o){ return url.startsWith('file:') ? super.fetch(url,o) : null; } }
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if(!/Could not load link/.test(e.message)) console.error(e.message); });
const path = require('path');
const assert = require('assert');
const store = {};               // shared localStorage across page loads
async function load(url){
  const dom = await JSDOM.fromFile(path.join(__dirname,url.split('?')[0]), {
    url: 'file://' + path.join(__dirname,url),
    runScripts: 'dangerously', resources: new Local(), virtualConsole: vc,
    beforeParse(w){
      const ls = { getItem:k=>k in store?store[k]:null, setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]} };
      Object.defineProperty(w,'localStorage',{value:ls});
      w.matchMedia = () => ({ matches:false });
      w.__errors = []; w.addEventListener('error', e => w.__errors.push(e.message));
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  assert.deepStrictEqual(dom.window.__errors, [], 'JS errors: ' + dom.window.__errors);
  return dom.window;
}
(async () => {
  // index page still works
  let w = await load('index.html');
  const topicKeys = Object.keys(w.VOCAB_DATA);
  const totalWords = topicKeys.reduce((n, k) => n + w.VOCAB_DATA[k].words.length, 0);
  assert.strictEqual(w.document.querySelectorAll('.topic-card').length, topicKeys.length);

  // every topic renders, examples default to original
  for (const k of Object.keys(w.VOCAB_DATA)) {
    const t = await load(`topic.html?topic=${k}`);
    const entries = t.document.querySelectorAll('.entry');
    assert.strictEqual(entries.length, t.VOCAB_DATA[k].words.length, k);
    assert.strictEqual(t.document.querySelectorAll('.level-btn').length, 6);
    assert.strictEqual(entries[0].querySelectorAll('.status-btn').length, 3);
    assert.ok(!entries[0].querySelector('.dict-link'), 'no dictionary link');
    assert.strictEqual(entries[0].querySelector('.entry-ex').textContent, t.VOCAB_DATA[k].words[0].ex);
    assert.ok(!/undefined/.test(t.document.getElementById('entries').textContent), 'no "undefined" on ' + k);
  }

  // Unknown topic falls back to the first topic, with key and data in sync
  { const t = await load('topic.html?topic=9999');
    assert.strictEqual(t.document.getElementById('topic-number').textContent, topicKeys[0]);
    assert.strictEqual(t.document.querySelectorAll('.entry').length, t.VOCAB_DATA[topicKeys[0]].words.length);
    assert.strictEqual(t.document.querySelector('.entry').dataset.id.split('|')[0], topicKeys[0]); }

  // Level buttons live in the nav row, directly before the Random button
  { const d = (await load('topic.html?topic=0002')).document;
    const bar = d.getElementById('level-bar'), rnd = d.querySelector('nav [data-random-word]');
    assert.ok(bar.closest('nav') && bar.parentElement === rnd.parentElement, 'same row as Random');
    assert.strictEqual(bar.nextElementSibling, rnd);
    assert.ok(!d.querySelector('header .level-bar'), 'removed from header'); }

  // CEFR level switching + persistence + toggle off
  w = await load('topic.html?topic=0004');
  const first = w.VOCAB_DATA['0004'].words[0];
  w.document.querySelector('.level-btn[data-level="B2"]').click();
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][3]);
  assert.match(w.document.getElementById('count').textContent, /B2 examples/);
  w = await load('topic.html?topic=0004');                 // reload: level persisted
  assert.ok(w.document.querySelector('.level-btn[data-level="B2"]').classList.contains('active'));
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][3]);
  w.document.querySelector('.level-btn[data-level="C2"]').click();
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][5]);
  w.document.querySelector('.level-btn[data-level="C2"]').click(); // deselect -> original
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, first.ex);

  // search still works with a level active
  w.document.querySelector('.level-btn[data-level="A1"]').click();
  // pick a word in 0004 whose search matches exactly one entry
  const words4 = w.VOCAB_DATA['0004'].words;
  const hits = q => words4.filter(y => [y.w, y.def, y.tr || ''].some(f => f.toLowerCase().includes(q.toLowerCase()))).length;
  const target = words4.find(x => hits(x.w) === 1).w;
  const sid = '0004|' + target;
  const s = w.document.getElementById('search'); s.value = target; s.dispatchEvent(new w.Event('input'));
  assert.strictEqual(w.document.querySelectorAll('.entry').length, 1);
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][target][0]);

  // learning status: set, persist, survive search re-render, switch, clear
  let e = w.document.querySelector('.entry');
  e.querySelector('[data-status="weak"]').click();
  assert.ok(e.classList.contains('is-weak'));
  s.value=''; s.dispatchEvent(new w.Event('input'));
  w = await load('topic.html?topic=0004');
  e = [...w.document.querySelectorAll('.entry')].find(x => x.dataset.id === sid);
  assert.ok(e.querySelector('[data-status="weak"]').classList.contains('active'));
  e.querySelector('[data-status="memorized"]').click();
  assert.ok(e.classList.contains('is-memorized') && !e.classList.contains('is-weak'));
  assert.strictEqual(JSON.parse(store['vocab-status'])[sid], 'memorized');
  e.querySelector('[data-status="memorized"]').click();       // click again clears
  assert.ok(!(sid in JSON.parse(store['vocab-status'])));

  // theme toggle unaffected
  const before = w.document.documentElement.getAttribute('data-theme');
  w.document.getElementById('theme-toggle').click();
  assert.notStrictEqual(store['vocab-theme'], before);
  assert.strictEqual(w.document.documentElement.getAttribute('data-theme'), store['vocab-theme']);

  // corrupt storage must not break the page
  store['vocab-status'] = '{bad'; store['vocab-level'] = '"Z9"';
  w = await load('topic.html?topic=0001');
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_DATA['0001'].words[0].ex);
  // ---- Random word (index + topic pages) ----
  for (const page of ['index.html', 'topic.html?topic=0003']) {
    store['vocab-level'] = 'null';
    w = await load(page);
    const d = w.document, btn = d.querySelector('[data-random-word]');
    assert.ok(btn, 'random button on ' + page);
    assert.strictEqual(w.VocabRandom.poolSize, totalWords);
    const seen = new Set(); let prev = null;
    for (let n = 0; n < 400; n++) {
      if (n === 0) btn.click(); else d.getElementById('rw-next').click();
      assert.ok(d.querySelector('.rw-backdrop').classList.contains('open'));
      const word = d.getElementById('rw-word').textContent;
      assert.notStrictEqual(word, prev, 'no immediate repeat'); prev = word;
      // identify the topic from the card link (some words appear in more than one topic)
      const k = d.getElementById('rw-topic').getAttribute('href').split('topic=')[1];
      const it = (w.VOCAB_DATA[k] || {words: []}).words.find(x => x.w === word);
      assert.ok(it, 'word exists: ' + k + ' ' + word);
      const e = {k, it};
      seen.add(e.k);
      assert.strictEqual(d.getElementById('rw-pos').textContent, e.it.p);
      assert.strictEqual(d.getElementById('rw-uz').textContent, e.it.tr || e.it.def);
      const en = d.getElementById('rw-en');
      if (e.it.tr) assert.strictEqual(en.textContent, e.it.def);
      else assert.strictEqual(en.textContent, 'Not in this reference yet');
      assert.ok(!d.getElementById('rw-oxford'), 'no Oxford link in random card');
      assert.strictEqual(d.getElementById('rw-ex').textContent, e.it.ex);
      assert.ok(d.getElementById('rw-topic').getAttribute('href') === 'topic.html?topic=' + e.k);
    }
    assert.ok(seen.size >= 50, 'words come from many topics: ' + seen.size);
    // Escape closes
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!d.querySelector('.rw-backdrop').classList.contains('open'));
  }
  // Respects the saved CEFR level
  store['vocab-level'] = '"B2"';
  w = await load('index.html');
  w.document.querySelector('[data-random-word]').click();
  const rw = w.document.getElementById('rw-word').textContent;
  const k = w.document.getElementById('rw-topic').getAttribute('href').split('topic=')[1];
  assert.strictEqual(w.document.getElementById('rw-ex').textContent, w.VOCAB_EXAMPLES[k][rw][3]);
  assert.strictEqual(w.document.getElementById('rw-ex-label').textContent, 'Example · B2');
  // Backdrop click closes
  w.document.querySelector('.rw-backdrop').click();
  assert.ok(!w.document.querySelector('.rw-backdrop').classList.contains('open'));

  // ---- Home page: TOPIK I / TOPIK II filter + global search ----
  { delete store['vocab-topik'];
    w = await load('index.html');
    const d = w.document, D = w.VOCAB_DATA;
    const isII = k => /^TOPIK II\b/.test(D[k].title);
    const visible = () => [...d.querySelectorAll('.topic-card')].filter(c => c.style.display !== 'none').map(c => c.dataset.key);
    const btnI = d.querySelector('.topik-btn[data-topik="I"]'), btnII = d.querySelector('.topik-btn[data-topik="II"]');
    assert.ok(btnI && btnII, 'TOPIK buttons exist');
    assert.strictEqual(btnI.parentElement.parentElement, d.querySelector('[data-random-word]').parentElement, 'next to Random');
    // default TOPIK I
    assert.ok(btnI.classList.contains('active'));
    assert.deepStrictEqual(visible(), Object.keys(D).filter(k => !isII(k)));
    btnII.click();
    assert.ok(btnII.classList.contains('active') && !btnI.classList.contains('active'));
    assert.deepStrictEqual(visible(), Object.keys(D).filter(isII));
    assert.strictEqual(store['vocab-topik'], 'II');
    w = await load('index.html');                                   // persisted
    assert.ok(w.document.querySelector('.topik-btn[data-topik="II"]').classList.contains('active'));

    // search: Korean word, English definition, Uzbek translation; covers both levels
    const d2 = w.document, s2 = d2.getElementById('search');
    const search = q => { s2.value = q; s2.dispatchEvent(new w.Event('input')); return [...d2.querySelectorAll('#search-results .hit')]; };
    const k2 = Object.keys(D).find(isII), it2 = D[k2].words[0];
    let hits = search(it2.w);
    assert.ok(hits.length >= 1 && hits[0].querySelector('.hit-word').textContent === it2.w, 'exact word ranked first');
    assert.strictEqual(d2.getElementById('topic-list').style.display, 'none');
    // 올림픽 is in both a TOPIK I and a TOPIK II topic: both appear whichever level is selected
    for (const lv of ['II', 'I']) {
      d2.querySelector(`.topik-btn[data-topik="${lv}"]`).click();
      const lvls = search('올림픽').map(h => isII(new w.URL(h.href).searchParams.get('topic')));
      assert.ok(lvls.includes(true) && lvls.includes(false), 'results from both levels');
    }
    hits = search(it2.w);
    assert.ok(hits.length >= 1 && hits[0].querySelector('.hit-word').textContent === it2.w, 'TOPIK II word found while TOPIK I is selected');
    assert.ok(search(it2.def).length >= 1, 'definition search');
    assert.ok(search(it2.tr).length >= 1, 'translation search');
    assert.strictEqual(search('zzzqqq-no-match').length, 0);
    assert.ok(d2.querySelector('#search-results .no-results'));
    search('');
    assert.strictEqual(d2.getElementById('topic-list').style.display, '');

    // result link opens the topic with the word pre-filled in its search box
    const href = search(it2.w)[0].getAttribute('href');
    const t = await load(href);
    assert.strictEqual(t.document.getElementById('search').value, it2.w);
    assert.ok([...t.document.querySelectorAll('.entry-word')].some(x => x.textContent === it2.w)); }

  // ---- Uzbek translations of TOPIK I A1–C2 sentences (examples_uz.js) ----
  { store['vocab-level'] = '"A1"';
    let t = await load('topic.html?topic=0001');
    const UZ = t.VOCAB_EXAMPLES_UZ, D = t.VOCAB_DATA;
    const isII = k => /^TOPIK II\b/.test(D[k].title);
    // every TOPIK I word has non-empty translations for all six levels; TOPIK II has none
    for (const k of Object.keys(D)) {
      if (isII(k)) { assert.ok(!UZ[k], 'no Uzbek A1 for ' + k); continue; }
      for (const it of D[k].words) for (const i of [0, 1, 2, 3, 4, 5]) {
        const v = UZ[k] && UZ[k][it.w] && UZ[k][it.w][i];
        assert.ok(v && !/[\uAC00-\uD7A3]/.test(v), 'uz ' + ['A1','A2','B1','B2','C1','C2'][i] + ' ' + k + ' ' + it.w);
      }
    }
    const it0 = D['0001'].words[0], e0 = t.document.querySelector('.entry');
    assert.strictEqual(e0.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][0]);
    assert.strictEqual(e0.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][0]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // A2: Korean A2 sentence + its Uzbek translation
    t.document.querySelector('.level-btn[data-level="A2"]').click();
    assert.strictEqual(t.document.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][1]);
    assert.strictEqual(t.document.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][1]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // B1: Korean B1 sentence + its Uzbek translation
    t.document.querySelector('.level-btn[data-level="B1"]').click();
    assert.strictEqual(t.document.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][2]);
    assert.strictEqual(t.document.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][2]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // B2: Korean B2 sentence + its Uzbek translation
    t.document.querySelector('.level-btn[data-level="B2"]').click();
    assert.strictEqual(t.document.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][3]);
    assert.strictEqual(t.document.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][3]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // C1: Korean C1 sentence + its Uzbek translation
    t.document.querySelector('.level-btn[data-level="C1"]').click();
    assert.strictEqual(t.document.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][4]);
    assert.strictEqual(t.document.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][4]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // C2: Korean C2 sentence + its Uzbek translation
    t.document.querySelector('.level-btn[data-level="C2"]').click();
    assert.strictEqual(t.document.querySelector('.entry-ex').textContent, t.VOCAB_EXAMPLES['0001'][it0.w][5]);
    assert.strictEqual(t.document.querySelector('.entry-ex-uz').textContent, UZ['0001'][it0.w][5]);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, D['0001'].words.length);
    // no level selected (original sentence): no Uzbek line
    t.document.querySelector('.level-btn[data-level="C2"]').click();   // back to original
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, 0);
    // TOPIK II with A1: no Uzbek line
    store['vocab-level'] = '"A1"';
    const kII = Object.keys(D).find(isII);
    t = await load('topic.html?topic=' + kII);
    assert.strictEqual(t.document.querySelectorAll('.entry-ex-uz').length, 0);

    // random card shows the Uzbek A1 line for TOPIK I words only
    const r = await load('index.html'), rd = r.document;
    rd.querySelector('[data-random-word]').click();
    let sawI = false, sawII = false;
    for (let n = 0; n < 300 && !(sawI && sawII); n++) {
      const k = rd.getElementById('rw-topic').getAttribute('href').split('topic=')[1];
      const word = rd.getElementById('rw-word').textContent, uz = rd.getElementById('rw-ex-uz');
      if (isII(k)) { sawII = true; assert.strictEqual(uz.style.display, 'none'); }
      else { sawI = true; assert.strictEqual(uz.textContent, UZ[k][word][0]); assert.notStrictEqual(uz.style.display, 'none'); }
      rd.getElementById('rw-next').click();
    }
    assert.ok(sawI && sawII, 'saw words from both levels');
    store['vocab-level'] = 'null'; }

  console.log('ALL TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
