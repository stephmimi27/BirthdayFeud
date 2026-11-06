import {readStorage} from './state/storage.js';

const themes = [
  {id:'garden', name:'Garden', note:'Sage leaves, flowers & a little greenhouse.', colors:['#77916c','#d5af9e','#fffdf4']},
  {id:'birthday', name:'Classic birthday', note:'Strawberry cake, ribboned gifts & pastel balloons.', colors:['#b75c79','#9fbdad','#fff6e9']},
  {id:'pajama', name:'Pajama party', note:'Chamomile tea, candlelight & a sleepy little cat.', colors:['#8d9a7c','#d9aaa6','#fcf4e8']},
  {id:'stars', name:'Celestial', note:'Moonlit skies, golden orbits & constellations.', colors:['#343459','#e4c386','#f7f0df']},
  {id:'ocean', name:'Ocean', note:'Coral gardens, pearl shells & underwater treasures.', colors:['#317e87','#df9c94','#edf8f0']}
];

// Grid-aligned paths keep every illustration crisp at any size.
const drawings = {
  garden:'<path fill="var(--sage)" d="M29 21h5v35h-5zM15 11h14v8h5v9H20v-7h-5zm19 19h15v-8h7v16H34z"/><path fill="var(--blush)" d="M14 51h38v8H14zm5 8h28v13H19z"/>',
  birthday:'<path fill="#9c546e" d="M9 36h46v29H9zM17 21h30v15H17zM4 66h56v4H4z"/><path fill="#f2c8a2" d="M12 42h40v19H12z"/><path fill="#df92a4" d="M20 25h24v11H20zM12 51h40v4H12z"/><path fill="#fff4d9" d="M7 36h50v7H7zm5 7h6v5h-6zm13 0h6v5h-6zm14 0h6v5h-6zM16 21h32v5H16z"/><path fill="#9fbdad" d="M23 10h4v11h-4zm14 0h4v11h-4z"/><path fill="#dbb66d" d="M23 3h4v6h-4zm14 0h4v6h-4z"/><path fill="#b95071" d="M28 28h8v6h-8z"/><path fill="#9fbdad" d="M30 26h4v3h-4z"/>',
  pajama:'<path fill="#c8b4a4" d="M17 9h4v9h-4zm10-6h4v13h-4zm10 6h4v9h-4z"/><path fill="#715363" d="M10 25h36v27h-5v7H15v-7h-5zm36 3h12v19H46v-5h7v-9h-7zM4 61h53v4H4z"/><path fill="#e6c5b1" d="M14 30h28v20h-4v5H18v-5h-4z"/><path fill="#9a7055" d="M14 26h28v5H14z"/><path fill="#fff1dc" d="M25 33h8v4h5v8h-5v5h-8v-5h-5v-8h5z"/><path fill="#d0ab68" d="M26 38h6v6h-6z"/><path fill="#8d9a7c" d="M32 48h3v7h-3zM5 67h51v3H5z"/>',
  stars:'<path fill="#b28a50" d="M23 7h16v5H27v6h-6v9h-5v17h5v7h7v5h19v-5h7v-8h5v15h-9v6H22v-5H12v-9H7V23h5v-9h11z"/><path fill="#f4d99d" d="M23 12h8v5h-9v10h-5v17h5v9h8v5h16v3H23v-5H15v-9h-4V25h5v-7h7z"/><path fill="#fff0c7" d="M15 28h4v13h-4zm9 23h7v4h-7z"/><path fill="#e4c386" d="M45 10h4v7h7v4h-7v7h-4v-7h-7v-4h7zM4 63h3v4h4v3H7v4H4v-4H0v-3h4z"/><path fill="#b5a2d1" d="M51 35h3v3h-3zM2 8h3v3H2z"/>',
  ocean:'<path fill="#d6aa75" d="M11 20h27v6h9v-7h10v28H47v-7h-9v6H11v-6H5V27h6z"/><path fill="#fff4d8" d="M17 21h5v24h-5zm12 5h4v14h-4z"/><path fill="#204f60" d="M9 28h3v4H9z"/><path fill="#df9c94" d="M9 55h4v14H9zm4 7h6v4h-6zm6-11h4v18h-4zm4 9h6v4h-6z"/><path fill="#71b5ae" d="M44 52h4v18h-4zm-7 5h7v4h-7zm11-7h7v4h-7z"/><path fill="#e9d4a5" d="M4 69h55v4H4z"/><path fill="none" stroke="#71b5ae" stroke-width="2" d="M43 7h6v6h-6zm10-6h4v4h-4z"/>',

};
const scenes = {
  birthday: '<img class="scene-illustration scene-left" src="/assets/themes/birthday-cake-table.svg" alt=""><img class="scene-illustration scene-right" src="/assets/themes/birthday-balloons-gifts.svg" alt="">',
  ocean: '<img class="scene-illustration scene-left" src="/assets/themes/ocean-coral-reef.svg" alt=""><img class="scene-illustration scene-right" src="/assets/themes/ocean-jellyfish-treasure.svg" alt="">',
  pajama: '<img class="scene-illustration scene-left" src="/assets/themes/sleepy-tea-window.svg" alt=""><img class="scene-illustration scene-right" src="/assets/themes/sleepy-tea-books.svg" alt="">',
  stars: '<img class="scene-illustration scene-left" src="/assets/themes/celestial-moon.svg" alt=""><img class="scene-illustration scene-right" src="/assets/themes/celestial-telescope.svg" alt="">'
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
    scene.innerHTML = scenes[current] || Array.from({length:4}, () => artwork(current)).join('');
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
    openDialog('Pick your party theme', `<p class="theme-intro">Five little pixel worlds. Choose one to change the whole party.</p><div class="theme-options">${themes.map(theme => `<button class="theme-card" data-preview-theme="${theme.id}" data-theme-choice="${theme.id}" aria-pressed="${current === theme.id}" style="--swatch:${theme.colors[0]};--swatch-paper:${theme.colors[2]}"><span class="theme-preview" style="--sage:${theme.colors[0]};--paper:${theme.colors[2]};--blush:${theme.colors[1]};--gold:#d6af55">${scenes[theme.id] || artwork(theme.id)}<span class="theme-swatches">${theme.colors.map(color => `<i style="background:${color}"></i>`).join('')}</span></span><strong>${theme.name}</strong><span>${theme.note}</span><b class="theme-selected" aria-hidden="true">✓</b></button>`).join('')}</div><p class="theme-footnote">Your theme saves automatically on this browser.</p>`, 'MAKE IT YOUR PARTY');
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.onclick = () => apply(button.dataset.themeChoice));
  };
  apply(readStorage('birthday-feud-theme', 'garden'), false);
  return refreshIcons;
}
