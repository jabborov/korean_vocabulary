// Loads one topic's example sentences, Uzbek translations and synonyms/opposites (topics/NNNN.js)
// on demand, so a page only downloads what it shows. loadTopicData(key) returns a promise that
// resolves once window.VOCAB_EXAMPLES[key], VOCAB_EXAMPLES_UZ[key] and VOCAB_RELATIONS[key] are set.
// It never rejects: if the file can't be loaded the page keeps working without those extras.
(function(){
  const cache = {};
  window.loadTopicData = function(key){
    key = String(key);
    if(!/^\d{4}$/.test(key)) return Promise.resolve();
    if(!cache[key]) cache[key] = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = `topics/${key}.js`;
      s.onload = () => resolve();
      s.onerror = () => { delete cache[key]; s.remove(); resolve(); };   // allow a retry later
      document.head.appendChild(s);
    });
    return cache[key];
  };
})();
