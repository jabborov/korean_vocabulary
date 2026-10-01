const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
class Local extends ResourceLoader { fetch(url,o){ return url.startsWith('file:') ? super.fetch(url,o) : null; } }
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if(!/Could not load link/.test(e.message)) console.error(e.message); });
const path = require('path');
const assert = require('assert');
const store = {};               // shared localStorage across page loads
async function load(url){
  const dom = await JSDOM.fromFile(path.join(__dirname,'site',url.split('?')[0]), {
    url: 'file://' + path.join(__dirname,'site',url),
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
  assert.strictEqual(w.document.querySelectorAll('.topic-card').length, 10);

  // every topic renders, examples default to original
  for (const k of Object.keys(w.VOCAB_DATA)) {
    const t = await load(`topic.html?topic=${k}`);
    const entries = t.document.querySelectorAll('.entry');
    assert.strictEqual(entries.length, t.VOCAB_DATA[k].words.length, k);
    assert.strictEqual(t.document.querySelectorAll('.level-btn').length, 6);
    assert.strictEqual(entries[0].querySelectorAll('.status-btn').length, 3);
    assert.ok(!entries[0].querySelector('.dict-link'), 'no dictionary link');
    assert.strictEqual(entries[0].querySelector('.entry-ex').textContent, t.VOCAB_DATA[k].words[0].ex);
  }

  // Level buttons live in the nav row, directly before the Random button
  { const d = (await load('topic.html?topic=0002')).document;
    const bar = d.getElementById('level-bar'), rnd = d.querySelector('nav [data-random-word]');
    assert.ok(bar.closest('nav') && bar.parentElement === rnd.parentElement, 'same row as Random');
    assert.strictEqual(bar.nextElementSibling, rnd);
    assert.ok(!d.querySelector('header .level-bar'), 'removed from header'); }

  // CEFR level switching + persistence + toggle off
  w = await load('topic.html?topic=0004');
  const first = w.VOCAB_DATA['0004'].words[0];
  w.document.querySelector('.level-btn[data-level="B1"]').click();
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][2]);
  assert.match(w.document.getElementById('count').textContent, /B1 examples/);
  w = await load('topic.html?topic=0004');                 // reload: level persisted
  assert.ok(w.document.querySelector('.level-btn[data-level="B1"]').classList.contains('active'));
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][2]);
  w.document.querySelector('.level-btn[data-level="C2"]').click();
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004'][first.w][5]);
  w.document.querySelector('.level-btn[data-level="C2"]').click(); // deselect -> original
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, first.ex);

  // search still works with a level active
  w.document.querySelector('.level-btn[data-level="A1"]').click();
  const s = w.document.getElementById('search'); s.value = 'cramped'; s.dispatchEvent(new w.Event('input'));
  assert.strictEqual(w.document.querySelectorAll('.entry').length, 1);
  assert.strictEqual(w.document.querySelector('.entry-ex').textContent, w.VOCAB_EXAMPLES['0004']['cramped'][0]);

  // learning status: set, persist, survive search re-render, switch, clear
  let e = w.document.querySelector('.entry');
  e.querySelector('[data-status="weak"]').click();
  assert.ok(e.classList.contains('is-weak'));
  s.value=''; s.dispatchEvent(new w.Event('input'));
  w = await load('topic.html?topic=0004');
  e = [...w.document.querySelectorAll('.entry')].find(x => x.dataset.id === '0004|cramped');
  assert.ok(e.querySelector('[data-status="weak"]').classList.contains('active'));
  e.querySelector('[data-status="memorized"]').click();
  assert.ok(e.classList.contains('is-memorized') && !e.classList.contains('is-weak'));
  assert.strictEqual(JSON.parse(store['vocab-status'])['0004|cramped'], 'memorized');
  e.querySelector('[data-status="memorized"]').click();       // click again clears
  assert.ok(!('0004|cramped' in JSON.parse(store['vocab-status'])));

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
    assert.strictEqual(w.VocabRandom.poolSize, 238);
    const all = Object.entries(w.VOCAB_DATA).flatMap(([k,t]) => t.words.map(it => ({k, t: t.title, it})));
    const seen = new Set(); let prev = null;
    for (let n = 0; n < 400; n++) {
      if (n === 0) btn.click(); else d.getElementById('rw-next').click();
      assert.ok(d.querySelector('.rw-backdrop').classList.contains('open'));
      const word = d.getElementById('rw-word').textContent;
      assert.notStrictEqual(word, prev, 'no immediate repeat'); prev = word;
      const e = all.find(x => x.it.w === word); assert.ok(e, 'word exists: ' + word);
      seen.add(e.k);
      assert.strictEqual(d.getElementById('rw-ipa').textContent, e.it.ipa);
      assert.strictEqual(d.getElementById('rw-pos').textContent, e.it.p);
      assert.strictEqual(d.getElementById('rw-uz').textContent, e.it.tr || e.it.def);
      const en = d.getElementById('rw-en');
      if (e.it.tr) assert.strictEqual(en.textContent, e.it.def);
      else assert.strictEqual(en.textContent, 'Not in this reference yet');
      assert.ok(!d.getElementById('rw-oxford'), 'no Oxford link in random card');
      assert.strictEqual(d.getElementById('rw-ex').textContent, e.it.ex);
      assert.ok(d.getElementById('rw-topic').getAttribute('href') === 'topic.html?topic=' + e.k);
    }
    assert.strictEqual(seen.size, 10, 'words come from all topics');
    // Escape closes
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!d.querySelector('.rw-backdrop').classList.contains('open'));
  }
  // Respects the saved CEFR level
  store['vocab-level'] = '"B2"';
  w = await load('index.html');
  w.document.querySelector('[data-random-word]').click();
  const rw = w.document.getElementById('rw-word').textContent;
  const k = Object.keys(w.VOCAB_DATA).find(k => w.VOCAB_DATA[k].words.some(x => x.w === rw));
  assert.strictEqual(w.document.getElementById('rw-ex').textContent, w.VOCAB_EXAMPLES[k][rw][3]);
  assert.strictEqual(w.document.getElementById('rw-ex-label').textContent, 'Example · B2');
  // Backdrop click closes
  w.document.querySelector('.rw-backdrop').click();
  assert.ok(!w.document.querySelector('.rw-backdrop').classList.contains('open'));

  console.log('ALL TESTS PASSED');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
