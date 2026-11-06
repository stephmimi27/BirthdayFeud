import {readStorage} from './state/storage.js';

const themes = [
  {id:'garden', name:'Garden', note:'Sage leaves, flowers & a little greenhouse.', colors:['#77916c','#d5af9e','#fffdf4']},
  {id:'birthday', name:'Classic birthday', note:'Pink frosting, candles & party confetti.', colors:['#d4518a','#f1c96c','#fff1f7']},
  {id:'pajama', name:'Pajama party', note:'Lavender gingham, sleepy moons & slippers.', colors:['#8772ae','#d7c9ee','#fbf7ff']},
  {id:'stars', name:'Glitter and stars', note:'Lilac skies, golden stars & pixel sparkle.', colors:['#9c64b8','#e6be65','#f9f0ff']},
  {id:'ocean', name:'Ocean', note:'Seafoam waves, tiny fish & coral treasures.', colors:['#278dac','#92d2cc','#eefbff']}
];

// Grid-aligned paths keep every illustration crisp at any size.
const drawings = {
  garden:'<path fill="var(--sage)" d="M29 21h5v35h-5zM15 11h14v8h5v9H20v-7h-5zm19 19h15v-8h7v16H34z"/><path fill="var(--blush)" d="M14 51h38v8H14zm5 8h28v13H19z"/>',
  birthday:'<path fill="var(--blush)" d="M8 37h48v29H8zM14 25h36v12H14z"/><path fill="var(--paper)" d="M8 37h48v8H8zm8 8h7v7h-7zm25 0h7v7h-7z"/><path fill="var(--sage)" d="M19 14h5v11h-5zm21 0h5v11h-5z"/><path fill="var(--gold)" d="M19 5h5v7h-5zm21 0h5v7h-5zM4 66h56v5H4z"/>',
  pajama:'<path fill="var(--gold)" d="M29 4h17v7H34v7h-7v20h7v7h17v-7h7v12h-8v7H29v-7H18v-8h-7V19h7v-8h11z"/><path fill="var(--sage)" d="M7 62h20v-9h9v9h20v10H7z"/><path fill="var(--blush)" d="M44 18h5v5h5v5h-5v5h-5v-5h-5v-5h5z"/>',
  stars:'<path fill="var(--gold)" d="M27 6h10v13h9v9h14v10H46v10h-9v14H27V48H17V38H3V28h14v-9h10z"/><path fill="var(--paper)" d="M27 24h10v14H27z"/><path fill="var(--blush)" d="M5 3h5v5h5v5h-5v5H5v-5H0V8h5zm47 51h5v5h5v5h-5v5h-5v-5h-5v-5h5z"/>',
  ocean:'<path fill="var(--sage)" d="M13 20h26v6h9v-9h9v32h-9v-9h-9v6H13v-7H6V27h7z"/><path fill="var(--paper)" d="M16 26h6v6h-6z"/><path fill="var(--blush)" d="M8 57h6v9h8V52h6v14h9V55h6v17H8z"/><path fill="var(--gold)" d="M45 4h7v7h-7zm10 49h6v6h-6z"/>'
};
const artwork = id => `<svg viewBox="0 0 64 76" shape-rendering="crispEdges" aria-hidden="true">${drawings[id]}</svg>`;

export function initThemes({openDialog, toast}) {
  let current = 'garden';
  const originals = new WeakMap();
  function refreshIcons() {
    document.querySelectorAll('svg use').forEach(use => {
      const href = use.getAttribute('href');
      if (/\#(?:sprout|flower|sprout-pot|flower-pot|pearl-pot)$/.test(href)) originals.set(use, href);
      if (originals.has(use)) use.setAttribute('href', current === 'garden' ? originals.get(use) : '#theme-motif');
    });
  }
  const scene = document.createElement('div');
  scene.className = 'theme-scene';
  scene.setAttribute('aria-hidden', 'true');
  document.querySelector('.greenhouse').append(scene);
  const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  symbol.classList.add('sprite-sheet');
  symbol.setAttribute('aria-hidden','true');
  document.body.append(symbol);

  function apply(id, persist = true) {
    const theme = themes.find(theme => theme.id === id) || themes[0];
    current = theme.id;
    document.documentElement.dataset.theme = current;
    symbol.innerHTML = `<defs><symbol id="theme-motif" viewBox="0 0 64 76">${drawings[current]}</symbol></defs>`;
    refreshIcons();
    scene.innerHTML = Array.from({length:4}, () => artwork(current)).join('');
    document.querySelector('.brand small').textContent = theme.name.toUpperCase() + ' EDITION';
    document.querySelector('.hero .eyebrow').innerHTML = `<span>✦</span> THE ${theme.name.toUpperCase()} EDITION <span>✦</span>`;
    document.getElementById('theme-toggle').setAttribute('aria-label', `Change theme, current theme: ${theme.name}`);
    document.querySelector('meta[name="theme-color"]').content = theme.colors[2];
    if (persist) {
      try { localStorage.setItem('birthday-feud-theme', JSON.stringify(current)); }
      catch { toast('Theme changed for this visit. Browser storage is unavailable.'); }
    }
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === current)));
  }

  document.getElementById('theme-toggle').onclick = () => {
    openDialog('Pick your party theme', `<p class="theme-intro">Five little pixel worlds. Choose one to change the whole party.</p><div class="theme-options">${themes.map(theme => `<button class="theme-card" data-theme-choice="${theme.id}" aria-pressed="${current === theme.id}" style="--swatch:${theme.colors[0]};--swatch-paper:${theme.colors[2]}"><span class="theme-preview" style="--sage:${theme.colors[0]};--paper:${theme.colors[2]};--blush:${theme.colors[1]};--gold:#d6af55">${artwork(theme.id)}<span class="theme-swatches">${theme.colors.map(color => `<i style="background:${color}"></i>`).join('')}</span></span><strong>${theme.name}</strong><span>${theme.note}</span><b class="theme-selected" aria-hidden="true">✓</b></button>`).join('')}</div><p class="theme-footnote">Your theme saves automatically on this browser.</p>`, 'MAKE IT YOUR PARTY');
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.onclick = () => apply(button.dataset.themeChoice));
  };
  apply(readStorage('birthday-feud-theme', 'garden'), false);
  return refreshIcons;
}
