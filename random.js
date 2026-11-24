// Random word: picks one word from ALL topics and shows it in a modal card.
// Usage: load after data.js and loader.js, then add any element with the attribute
// data-random-word; clicking it opens a random word. The word's example sentences,
// Uzbek translation and synonyms/opposites are fetched for its topic on demand (topics/NNNN.js).
(function(){
  const DATA = window.VOCAB_DATA || {};
  // Filled per topic by topics/NNNN.js, so read them when needed (not once at start-up).
  const EXAMPLES    = () => window.VOCAB_EXAMPLES    || {};   // topic -> word -> [A1 ... C2]
  const EXAMPLES_UZ = () => window.VOCAB_EXAMPLES_UZ || {};   // Uzbek: topic -> word -> [A1 ... C2]
  const RELATIONS   = () => window.VOCAB_RELATIONS   || {};   // topic -> word -> {syn, ant}
  const LEVELS = ['A1','A2','B1','B2','C1','C2'];
  const GROUPS = ['A','B','C'];

  // Flatten every topic into one pool: [{ topicKey, topicTitle, item }]
  const pool = [];
  Object.keys(DATA).forEach(k => DATA[k].words.forEach(item =>
    pool.push({ topicKey: k, topicTitle: DATA[k].title, item })
  ));
  if(!pool.length) return;

  // Every word stores the English meaning in `def` and Uzbek in `tr`.
  // If a future entry lacks `tr`, `def` is shown as the translation instead.
  function fields(entry){
    const it = entry.item;
    // Level groups chosen on the topic page (A = A1+A2, B = B1+B2, C = C1+C2), e.g. ["A","C"].
    let groups = null;
    try{ groups = JSON.parse(localStorage.getItem('vocab-levels')); }catch(e){}
    if(!Array.isArray(groups)){
      let old = null;
      try{ old = JSON.parse(localStorage.getItem('vocab-level')); }catch(e){}
      groups = LEVELS.includes(old) ? [old[0]] : [];
    }
    groups = GROUPS.filter(g => groups.includes(g));
    const set = (EXAMPLES()[entry.topicKey] || {})[it.w];
    const uzSet = (EXAMPLES_UZ()[entry.topicKey] || {})[it.w] || [];
    let exs = [];
    if(groups.length && set){
      LEVELS.forEach((lv, i) => {
        if(groups.includes(lv[0]) && set[i]) exs.push({ lv, ko: set[i], uz: uzSet[i] || '' });
      });
    }
    // No group selected: the original sentence from data.js, without a translation.
    if(!exs.length) exs = [{ lv: '', ko: it.ex, uz: '' }];
    return {
      en: it.tr ? it.def : null,
      uz: it.tr || it.def,
      exs, groups: exs[0].lv ? groups : [],
      rel: (RELATIONS()[entry.topicKey] || {})[it.w] || null
    };
  }

  // ----- Styles (uses the pages' existing theme variables) -----
  const css = `
  .rw-backdrop{ position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.55);
    display:none; align-items:center; justify-content:center; padding:20px; }
  .rw-backdrop.open{ display:flex; }
  .rw-card{ width:100%; max-width:560px; max-height:90vh; overflow:auto;
    background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:12px;
    padding:24px 26px; box-shadow:0 20px 50px var(--shadow); }
  .rw-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
  .rw-topic{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--accent); }
  .rw-topic:hover{ text-decoration:underline; }
  .rw-close{ background:none; border:1px solid var(--line); border-radius:6px; color:var(--muted);
    width:30px; height:30px; cursor:pointer; font-size:16px; line-height:1; flex-shrink:0; }
  .rw-close:hover{ color:var(--text); border-color:var(--text); }
  .rw-top{ display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .rw-word{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:600; }
  .rw-pos{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--accent);
    border:1px solid var(--accent-dim); border-radius:4px; padding:2px 8px; }
  .rw-row{ margin-bottom:12px; }
  .rw-label{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted);
    text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px; }
  .rw-en{ font-size:15px; }
  .rw-uz{ font-size:15px; color:var(--accent); }
  .rw-ex{ font-family:'Noto Sans KR','Inter',sans-serif; font-size:16.5px; line-height:1.7; color:var(--text); font-style:normal; }
  .rw-ex-uz{ font-size:14px; color:var(--accent); margin-top:4px; }
  .rw-ex-item + .rw-ex-item{ margin-top:10px; }
  .rw-ex-lv{ display:block; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); letter-spacing:.04em; }
  .rw-ex::before{ content:"\\201C"; } .rw-ex::after{ content:"\\201D"; }
  .rw-relbox{ display:inline-flex; flex-wrap:wrap; align-items:baseline; gap:4px 10px; }
  .rw-rel-label{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--accent);
    text-transform:uppercase; letter-spacing:.04em; }
  .rw-rel{ display:inline-flex; flex-wrap:wrap; align-items:baseline; gap:4px 10px; font-size:14px; }
  .rw-rel-word{ font-family:'Noto Sans KR','Inter',sans-serif; font-size:15px; }
  .rw-missing{ font-size:14px; color:var(--muted); }
  .rw-actions{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    margin-top:18px; padding-top:14px; border-top:1px dashed var(--line); }
  .rw-btn{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--accent); background:none;
    border:1px solid var(--accent); border-radius:6px; padding:6px 14px; cursor:pointer; }
  .rw-btn:hover{ background:var(--accent-dim); }
  @media print{ .rw-backdrop{ display:none !important; } [data-random-word]{ display:none !important; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ----- Modal markup -----
  const backdrop = document.createElement('div');
  backdrop.className = 'rw-backdrop';
  backdrop.innerHTML = `
    <div class="rw-card" role="dialog" aria-modal="true" aria-labelledby="rw-word">
      <div class="rw-head">
        <a class="rw-topic" id="rw-topic"></a>
        <button class="rw-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="rw-top">
        <span class="rw-word" id="rw-word"></span>
        <span class="rw-pos" id="rw-pos"></span>
        <span class="rw-relbox" id="rw-syn-row"><span class="rw-rel-label">Synonyms</span><span class="rw-rel" id="rw-syn"></span></span>
        <span class="rw-relbox" id="rw-ant-row"><span class="rw-rel-label">Opposites</span><span class="rw-rel" id="rw-ant"></span></span>
      </div>
      <div class="rw-row"><div class="rw-label">English meaning</div><div id="rw-en"></div></div>
      <div class="rw-row"><div class="rw-label">Uzbek translation</div><div class="rw-uz" id="rw-uz"></div></div>
      <div class="rw-row"><div class="rw-label" id="rw-ex-label">Example</div><div id="rw-exs"></div></div>
      <div class="rw-actions">
        <button class="rw-btn" type="button" id="rw-next">↻ Another random word</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const $ = id => backdrop.querySelector('#' + id);
  let lastIndex = -1, opener = null, current = 0;

  // Pick a word and show it at once; its topic data (examples, Uzbek, synonyms) is loaded
  // if needed and the card is filled again. Returns a promise that resolves when the card is complete.
  function show(){
    let i;
    do { i = Math.floor(Math.random() * pool.length); } while(pool.length > 1 && i === lastIndex);
    lastIndex = i;
    const entry = pool[i], my = ++current;
    fill(entry);
    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
      $('rw-next').focus();
    }
    const load = window.loadTopicData ? window.loadTopicData(entry.topicKey) : Promise.resolve();
    api.pending = load.then(() => { if(my === current) fill(entry); });
    return api.pending;
  }
  function fill(entry){
    const it = entry.item, f = fields(entry);

    const topic = $('rw-topic');
    topic.textContent = `${entry.topicKey} · ${entry.topicTitle}`;
    topic.href = `topic.html?topic=${entry.topicKey}`;
    $('rw-word').textContent = it.w;
    $('rw-pos').textContent = it.p;

    const en = $('rw-en');
    en.className = f.en ? 'rw-en' : 'rw-missing';
    if(f.en){ en.textContent = f.en; }
    else{
      en.textContent = 'Not in this reference yet';
    }
    $('rw-uz').textContent = f.uz;
    [['syn', 'rw-syn'], ['ant', 'rw-ant']].forEach(([key, id]) => {
      const list = (f.rel && f.rel[key]) || [], box = $(id);
      box.textContent = '';
      list.forEach(r => {
        const w = document.createElement('span'); w.className = 'rw-rel-word'; w.textContent = r.w;
        box.appendChild(w);
      });
      $(id + '-row').style.display = list.length ? '' : 'none';
    });
    $('rw-ex-label').textContent = f.groups.length ? `Examples · ${f.groups.join(' + ')}` : 'Example';
    const exs = $('rw-exs');
    exs.textContent = '';
    f.exs.forEach(e => {
      const row = document.createElement('div'); row.className = 'rw-ex-item';
      if(e.lv){ const lv = document.createElement('span'); lv.className = 'rw-ex-lv'; lv.textContent = e.lv; row.appendChild(lv); }
      const ko = document.createElement('div'); ko.className = 'rw-ex'; ko.textContent = e.ko; row.appendChild(ko);
      if(e.uz){ const uz = document.createElement('div'); uz.className = 'rw-ex-uz'; uz.lang = 'uz'; uz.textContent = e.uz; row.appendChild(uz); }
      exs.appendChild(row);
    });
  }
  function close(){
    backdrop.classList.remove('open');
    if(opener && opener.focus) opener.focus();
  }

  document.addEventListener('click', e => {
    if(e.target.closest('[data-random-word]')){ e.preventDefault(); show(); }
  });
  $('rw-next').addEventListener('click', show);
  backdrop.querySelector('.rw-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && backdrop.classList.contains('open')) close();
  });

  const api = window.VocabRandom = { show, close, poolSize: pool.length, pending: Promise.resolve() };
})();
