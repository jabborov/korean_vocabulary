// Random word: picks one word from ALL topics and shows it in a modal card.
// Usage: load after data.js (and examples.js), then add any element with
// the attribute data-random-word; clicking it opens a random word.
(function(){
  const DATA = window.VOCAB_DATA || {};
  const EXAMPLES = window.VOCAB_EXAMPLES || {};
  const LEVELS = ['A1','A2','B1','B2','C1','C2'];

  // Flatten every topic into one pool: [{ topicKey, topicTitle, item }]
  const pool = [];
  Object.keys(DATA).forEach(k => DATA[k].words.forEach(item =>
    pool.push({ topicKey: k, topicTitle: DATA[k].title, item })
  ));
  if(!pool.length) return;

  // Topics 0001–0006 store the Uzbek translation in `def` and have no `tr`.
  // Topics 0007+ store the English meaning in `def` and Uzbek in `tr`.
  function fields(entry){
    const it = entry.item;
    let level = null;
    try{ level = JSON.parse(localStorage.getItem('vocab-level')); }catch(e){}
    const set = (EXAMPLES[entry.topicKey] || {})[it.w];
    const idx = LEVELS.indexOf(level);
    const ex = (idx >= 0 && set && set[idx]) || it.ex;
    return {
      en: it.tr ? it.def : null,
      uz: it.tr || it.def,
      ex, level: (idx >= 0 && set && set[idx]) ? level : null
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
  .rw-ipa{ font-family:'JetBrains Mono',monospace; font-size:14px; color:var(--muted); }
  .rw-row{ margin-bottom:12px; }
  .rw-label{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--muted);
    text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px; }
  .rw-en{ font-size:15px; }
  .rw-uz{ font-size:15px; color:var(--accent); }
  .rw-ex{ font-size:14.5px; color:var(--muted); font-style:italic; }
  .rw-ex::before{ content:"\\201C"; } .rw-ex::after{ content:"\\201D"; }
  .rw-missing{ font-size:14px; color:var(--muted); }
  .rw-missing a{ color:var(--accent); }
  .rw-actions{ display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
    margin-top:18px; padding-top:14px; border-top:1px dashed var(--line); }
  .rw-btn{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--accent); background:none;
    border:1px solid var(--accent); border-radius:6px; padding:6px 14px; cursor:pointer; }
  .rw-btn:hover{ background:var(--accent-dim); }
  .rw-oxford{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--muted); }
  .rw-oxford:hover{ color:var(--accent); }
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
        <span class="rw-ipa" id="rw-ipa"></span>
      </div>
      <div class="rw-row"><div class="rw-label">English meaning</div><div id="rw-en"></div></div>
      <div class="rw-row"><div class="rw-label">Uzbek translation</div><div class="rw-uz" id="rw-uz"></div></div>
      <div class="rw-row"><div class="rw-label" id="rw-ex-label">Example</div><div class="rw-ex" id="rw-ex"></div></div>
      <div class="rw-actions">
        <button class="rw-btn" type="button" id="rw-next">↻ Another random word</button>
        <a class="rw-oxford" id="rw-oxford" target="_blank" rel="noopener">Oxford ↗</a>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const $ = id => backdrop.querySelector('#' + id);
  const oxfordUrl = w => `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(w)}`;
  let lastIndex = -1, opener = null;

  function show(){
    let i;
    do { i = Math.floor(Math.random() * pool.length); } while(pool.length > 1 && i === lastIndex);
    lastIndex = i;
    const entry = pool[i], it = entry.item, f = fields(entry);

    const topic = $('rw-topic');
    topic.textContent = `${entry.topicKey} · ${entry.topicTitle}`;
    topic.href = `topic.html?topic=${entry.topicKey}`;
    $('rw-word').textContent = it.w;
    $('rw-pos').textContent = it.p;
    $('rw-ipa').textContent = it.ipa;

    const en = $('rw-en');
    en.className = f.en ? 'rw-en' : 'rw-missing';
    if(f.en){ en.textContent = f.en; }
    else{
      en.textContent = 'Not in this reference yet — ';
      const a = document.createElement('a');
      a.href = oxfordUrl(it.w); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'see Oxford';
      en.appendChild(a);
    }
    $('rw-uz').textContent = f.uz;
    $('rw-ex-label').textContent = f.level ? `Example · ${f.level}` : 'Example';
    $('rw-ex').textContent = f.ex;
    $('rw-oxford').href = oxfordUrl(it.w);

    if(!backdrop.classList.contains('open')){
      opener = document.activeElement;
      backdrop.classList.add('open');
      $('rw-next').focus();
    }
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

  window.VocabRandom = { show, close, poolSize: pool.length };
})();
