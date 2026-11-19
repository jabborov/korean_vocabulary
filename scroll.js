// Scroll buttons: "to top" and "to bottom", fixed at the right-centre of the page.
// Usage: load on any page; uses the page's theme variables (--bg, --line, --muted, --accent).
(function(){
  const css = `
  .sc-wrap{ position:fixed; right:16px; top:50%; transform:translateY(-50%); z-index:50;
    display:flex; flex-direction:column; gap:8px; }
  .sc-btn{ width:40px; height:40px; border-radius:50%; cursor:pointer;
    background:var(--bg); color:var(--muted); border:1px solid var(--line);
    font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px var(--shadow, rgba(0,0,0,.2));
    transition:opacity .2s, visibility .2s, color .15s, border-color .15s; }
  .sc-btn:hover{ color:var(--accent); border-color:var(--accent); }
  .sc-btn.sc-hidden{ opacity:0; visibility:hidden; pointer-events:none; }
  @media (max-width:600px){ .sc-wrap{ right:10px; } .sc-btn{ width:36px; height:36px; font-size:16px; } }
  @media print{ .sc-wrap{ display:none !important; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'sc-wrap';
  wrap.innerHTML =
    '<button class="sc-btn" type="button" id="sc-up" aria-label="Scroll to top" title="Scroll to top">↑</button>' +
    '<button class="sc-btn" type="button" id="sc-down" aria-label="Scroll to bottom" title="Scroll to bottom">↓</button>';
  document.body.appendChild(wrap);

  const up = wrap.querySelector('#sc-up'), down = wrap.querySelector('#sc-down');
  const root = document.documentElement;
  const maxY = () => Math.max(root.scrollHeight, document.body.scrollHeight) - window.innerHeight;
  const go = top => window.scrollTo({ top, behavior: 'smooth' });

  up.addEventListener('click', () => go(0));
  down.addEventListener('click', () => go(maxY()));

  // Hide "up" at the top and "down" at the bottom; hide both if the page doesn't scroll.
  function update(){
    const y = window.scrollY || root.scrollTop, m = maxY();
    up.classList.toggle('sc-hidden', y < 100);
    down.classList.toggle('sc-hidden', m <= 0 || y >= m - 100);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // page content (topic list, search results, word list) can change height
  if (window.ResizeObserver) new ResizeObserver(update).observe(document.body);
  update();
})();
