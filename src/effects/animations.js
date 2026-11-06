const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=selector=>document.querySelector(selector);
const colors=['#cfa877','#e3b4bc','#b1c490','#e4c778'];

export function initEffects(){
  if($('.ambient-effects'))return;
  const scene=$('.greenhouse'),board=$('.game-board');
  const ambient=document.createElement('div');ambient.className='ambient-effects';ambient.setAttribute('aria-hidden','true');
  const positions=[[3,15],[13,22],[19,8],[27,18],[37,7],[47,15],[57,6],[67,16],[78,9],[88,18],[96,10],[8,44],[19,63],[4,78],[14,89],[89,45],[97,66],[85,82],[93,92],[24,40],[76,60],[52,87]];
  positions.forEach(([x,y],i)=>{const star=document.createElement('i');star.className='ambient-star '+(i%4===0?'pixel-flower':'');star.style.cssText=`left:${x}%;top:${y}%;--star-size:${[10,7,13,8][i%4]}px;--star-color:${colors[i%4]};--star-delay:${-i*.63}s;--star-speed:${3.2+i%4*.6}s`;ambient.append(star);});
  scene.append(ambient);
  const lights=document.createElement('div');lights.className='fairy-lights';lights.setAttribute('aria-hidden','true');
  for(let i=0;i<19;i++){const bulb=document.createElement('i');bulb.style.cssText=`--light-y:${Math.round(Math.sin(i/18*Math.PI)*8)}px;--light-delay:${-i*.42}s;--light-color:${['#e6ce8d','#e2b8b6','#c5d2a8'][i%3]}`;lights.append(bulb);}scene.append(lights);
  for(const edge of ['top','bottom','left','right']){const lace=document.createElement('div');lace.className='board-lace lace-'+edge;lace.setAttribute('aria-hidden','true');board.append(lace);}
  const layer=document.createElement('div');layer.id='effect-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
}
function animateClass(node,name,duration){
  if(!node||reduced())return;
  node.classList.remove(name);void node.offsetWidth;node.classList.add(name);setTimeout(()=>node.classList.remove(name),duration);
}
function burst(node,count,birthday=false){
  if(!node||reduced())return;
  const layer=$('#effect-layer'),rect=node.getBoundingClientRect();if(!layer)return;
  for(let i=0;i<count;i++){
    const particle=document.createElement('i'),angle=Math.PI*2*i/count+(Math.random()-.5)*.4,distance=(birthday?68:38)+Math.random()*(birthday?75:35);
    particle.className='effect-particle '+(birthday&&i%5===0?'flower-particle':'');
    particle.style.cssText=`left:${rect.left+rect.width/2}px;top:${rect.top+rect.height/2}px;--particle-color:${colors[i%colors.length]};--particle-size:${(birthday?6:4)+Math.random()*7}px;--particle-dx:${Math.cos(angle)*distance}px;--particle-dy:${Math.sin(angle)*distance-30}px;--particle-rotate:${Math.random()*160-80}deg;--particle-life:${950+Math.random()*450}ms;animation-delay:${Math.random()*90}ms`;
    layer.append(particle);setTimeout(()=>particle.remove(),1600);
  }
}
export function revealEffects(result){
  if(reduced())return;
  for(const i of result.indices||[]){const tile=$(`[data-slot="${i}"]`);animateClass(tile,i===5?'birthday-reveal':'answer-reveal',i===5?1400:600);burst(tile,i===5?30:9,i===5);}
  animateClass($('#round-points'),'points-pop',450);
}
export function wrongEffects(){animateClass($('.game-board'),'wrong-shake',420);}
export function awardEffects(team){
  const card=$(`[data-team="${team}"]`)?.closest('.team-card');animateClass(card,'team-won',1500);burst(card,24,true);
}
export function winnerEffects(dialog){
  if(reduced())return;
  const layer=dialog.querySelector('.results-party');if(!layer)return;
  for(let i=0;i<64;i++){
    const bit=document.createElement('i');bit.className='winner-confetti '+(i%3===0?'star-confetti':'');
    bit.style.cssText=`--confetti-left:${Math.random()*100}%;--confetti-size:${4+Math.random()*5}px;--confetti-color:${colors[i%colors.length]};--confetti-delay:${Math.random()*1.5}s;--confetti-duration:${3+Math.random()*1.8}s;--confetti-drift:${Math.random()*150-75}px;--confetti-spin:${Math.random()*540-270}deg`;
    layer.append(bit);setTimeout(()=>bit.remove(),6500);
  }
}
