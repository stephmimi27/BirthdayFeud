import {byId as $, escapeHTML as esc} from './utils/dom.js';
import {readStorage as stored, writeGameStorage} from './state/storage.js';
import {surveyImportMarkup} from './components/modals/SurveyImport.js';
import {teamsModalMarkup} from './components/modals/Teams.js';
import {rulesMarkup} from './components/modals/Rules.js';
import {questionsMarkup} from './components/modals/Questions.js';
import {birthdayAnswersMarkup} from './components/modals/BirthdayAnswers.js';
import {hostControlsMarkup} from './components/modals/HostControls.js';
import {answerGroupsMarkup} from './components/modals/AnswerGroups.js';
import {answerBoardMarkup} from './components/AnswerBoard.js';
import {teamCardsMarkup} from './components/TeamCards.js';
import {questionPickerMarkup} from './components/QuestionPicker.js';
import {teamEditorMarkup} from './components/TeamEditor.js';
import {demoDataset,parseTSV,tableToDataset,validateDataset,normalize} from './game/data.js';
import {freshState,restoreState,currentRound,roundAnswers,roundPoints,freezeRound,finishRound,submitGuess,awardPoints,resetCurrentRound,getGameResults} from './game/engine.js';
import {initEffects,revealEffects,wrongEffects,awardEffects,winnerEffects} from './effects/animations.js';
import {resultsMarkup} from './components/results.js';




let dataset=demoDataset(),state=freshState(dataset.questions.length),history=[],feedback=null,pasteDraft='',teamPage=0,toastTimer,audioContext;
let resultsTimer,lastResultsShown='';
const teamPageSize=()=>window.innerWidth>=1000?4:window.innerWidth>=740?3:2;
const roundPageSize=()=>window.innerWidth>=740?10:8;
try{const cached=stored('birthday-feud-dataset',null);if(cached)dataset=validateDataset(cached);state=freshState(dataset.questions.length);const previous=stored('birthday-feud-state',null);if(previous)state=restoreState(previous,dataset.questions.length);}catch{state=freshState(dataset.questions.length);}
const round=()=>currentRound(state),answers=()=>roundAnswers(state,dataset),pot=()=>roundPoints(state,dataset),question=()=>round().snapshot||dataset.questions[state.index];
function save() {
  try { writeGameStorage(state, dataset); }
  catch { toast('Browser storage is unavailable. Keep this tab open or download a game backup.'); }
}
function checkpoint(){history.push(structuredClone(state));if(history.length>50)history.shift();}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function play(kind='correct'){
  if(!state.sound)return;
  try{audioContext ||=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const now=audioContext.currentTime,notes=kind==='wrong'?[160,110]:kind==='award'?[440,554,659,880]:[523,659,784];notes.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=kind==='wrong'?'sawtooth':'square';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,now+i*.09);gain.gain.exponentialRampToValueAtTime(.025,now+i*.09+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.09+.17);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.09);osc.stop(now+i*.09+.18);});}catch{}
}
function celebrate(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<40;i++){const bit=document.createElement('i');bit.className='confetti-bit';bit.style.cssText=`left:${Math.random()*100}vw;background:${['#c99f8a','#b9c9a0','#e2c983','#7b9b76'][i%4]};animation-delay:${Math.random()*.4}s;--drift:${Math.random()*160-80}px`;$('confetti').append(bit);setTimeout(()=>bit.remove(),2900);}}
function render(){
  const r=round();if(r.finished&&!r.snapshot)finishRound(state,dataset);
  const q=question(),a=answers(),count=dataset.questions.length,summary=getGameResults(state);
  $('question-count').textContent=count;$('team-count').textContent=state.teams.length;$('questions-total').textContent=count+' '+(count===1?'QUESTION':'QUESTIONS');
  $('question-text').textContent=q.text;$('question-text').title=q.text;$('question-number').textContent=`QUESTION ${String(state.index+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;$('multiplier-label').textContent=r.multiplier+'× POINTS';$('round-points').textContent=String(pot()).padStart(3,'0');
  $('dataset-label').textContent=dataset.source==='demo'?'SAMPLE DATA':'SURVEY RESPONSES';$('responses-label').textContent=`${q.responses} ${q.responses===1?'RESPONSE':'RESPONSES'}`;
  $('answer-grid').innerHTML=answerBoardMarkup({r, a});
  const visible=a.filter((answer,i)=>answer&&r.revealed[i]).length;$('answer-status').textContent=r.awarded?`Round awarded to ${state.teams[r.awarded.team]||r.awarded.teamName||'a previous team'}`:r.finished?'Round complete · all answers revealed':`${visible} / ${a.filter(Boolean).length} answers revealed`;
  for(let i=0;i<3;i++)$('strike-'+i).classList.toggle('on',r.strikes>i);
  $('clear-strikes').disabled=!r.strikes;
  $('guess-team').innerHTML=state.teams.map((team,i)=>`<option value="${i}" ${i===state.activeTeam?'selected':''}>${esc(team)}</option>`).join('');
  $('guess-team').disabled=Boolean(r.awarded);$('guess-input').disabled=Boolean(r.awarded)||r.finished||r.strikes>=3||!a.some(Boolean);$('guess-submit').disabled=$('guess-input').disabled;
  $('guess-input').placeholder=r.finished||r.awarded?'Round complete. Choose the next question.':r.strikes>=3?'Pass the turn to keep playing…':!a.some(Boolean)?'Add survey responses to get started…':'What’s your guess?';
  $('pass-turn').disabled=Boolean(r.awarded)||r.finished||state.teams.length<2;
  $('end-round').disabled=Boolean(r.finished||r.awarded)&&!summary.ready;$('end-round').textContent=summary.ready?'View results':r.finished||r.awarded?'Round complete ✓':'End round';
  const status=$('guess-feedback');status.className='guess-feedback'+(feedback?' '+feedback.type:'');status.innerHTML=feedback?`<span class="feedback-symbol">${feedback.type==='correct'?'✿':feedback.type==='wrong'?'×':'✦'}</span> ${esc(feedback.message)}`:r.finished||r.awarded?'All answers revealed. Choose the next question.':r.strikes>=3?'Three strikes! Pass the turn to give another team a chance.':'Type an answer and press Enter.';
  const perPage=teamPageSize(),pages=Math.ceil(state.teams.length/perPage);teamPage=Math.min(teamPage,pages-1);
  $('team-grid').style.setProperty('--visible-team-count',Math.min(perPage,state.teams.length-teamPage*perPage));
  $('team-page-label').textContent=`${teamPage+1} / ${pages}`;$('prev-teams').disabled=teamPage===0;$('next-teams').disabled=teamPage===pages-1;
  $('team-grid').innerHTML=teamCardsMarkup({state, r, teamPage, perPage, points: pot()});
  $('round-progress').textContent=String(state.index+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');$('prev-round').disabled=state.index===0;
  const complete=Boolean(r.finished||r.awarded);$('next-round').disabled=false;
  const nextLabel=summary.ready?'View results':!complete?'End round and reveal all answers':state.index<count-1?'Next question':summary.pendingRounds.length?'Review unassigned points':'Continue unfinished rounds';
  $('next-round').innerHTML=summary.ready?'View results <span>★</span>':!complete?'End round <span>✓</span>':state.index<count-1?'Next question <span>→</span>':summary.pendingRounds.length?'Review points <span>→</span>':'Continue game <span>→</span>';
  $('next-round').setAttribute('aria-label',nextLabel);$('next-round').title=nextLabel;
  const firstRound=Math.floor(state.index/roundPageSize())*roundPageSize();
  $('round-picker').style.setProperty('--visible-round-count',Math.min(roundPageSize(),state.rounds.length-firstRound));
  $('round-picker').innerHTML=questionPickerMarkup({state, dataset, firstRound, pageSize: roundPageSize()});
  $('sound-toggle').setAttribute('aria-pressed',String(state.sound));$('sound-toggle').setAttribute('aria-label',state.sound?'Turn sound off':'Turn sound on');
  $('import-label').textContent=dataset.source==='demo'?'Import survey':'Update survey';$('strip-title').textContent=dataset.source==='demo'?'Import survey responses':'Survey loaded';
  $('strip-description').textContent=dataset.source==='demo'?'Copy questions and responses from Google Sheets, then paste them here.':`${count} ${count===1?'question':'questions'} · ${dataset.respondents} response ${dataset.respondents===1?'row':'rows'} · ${state.teams.length} ${state.teams.length===1?'team':'teams'}. Paste again whenever you want to update.`;
}
function guess(value){
  const before=structuredClone(state),result=submitGuess(state,dataset,value);
  if(['correct','wrong'].includes(result.type)){history.push(before);if(history.length>50)history.shift();save();play(result.type);}
  feedback={type:result.type,message:result.type==='correct'?`${result.text} — ${result.birthday?'Birthday answer. ':''}${result.count*round().multiplier} ${result.count*round().multiplier===1?'point':'points'} added to the round.`:result.message};
  if(result.type==='wrong'&&round().strikes>=3)feedback.message='Three strikes! Pass the turn to another team.';
  render();if(result.type==='correct')revealEffects(result);else if(result.type==='wrong')wrongEffects();
  if(['correct','wrong'].includes(result.type))$('guess-input').value='';$('guess-input').focus();
}
function setRound(i){if(i<0||i>=dataset.questions.length)return;clearTimeout(resultsTimer);state.index=i;feedback=null;$('guess-input').value='';save();render();}
function endCurrentRound(){if(round().finished||round().awarded)return;checkpoint();const indices=answers().flatMap((a,i)=>a&&!round().revealed[i]?[i]:[]);finishRound(state,dataset);feedback={type:'info',message:'All answers revealed. Only guessed answers count toward the score.'};save();render();revealEffects({indices});queueResults();}
function advanceRound(){const summary=getGameResults(state);if(summary.ready){showResults();return;}if(!round().finished&&!round().awarded){endCurrentRound();return;}if(state.index<dataset.questions.length-1){setRound(state.index+1);return;}const next=summary.pendingRounds[0]??summary.unfinishedRounds[0];if(next!==undefined){setRound(next);if(summary.pendingRounds.length){feedback={type:'info',message:'Assign these earned points to a team before showing final results.'};render();}}}
function award(team){checkpoint();const indices=answers().flatMap((a,i)=>a&&!round().revealed[i]?[i]:[]),points=awardPoints(state,dataset,team);if(!points){history.pop();return;}feedback={type:'correct',message:`${points} points awarded to ${state.teams[team]}! All answers revealed.`};play('award');celebrate();save();render();revealEffects({indices});awardEffects(team);queueResults();}
function openDialog(title,html,eyebrow='GAME SETTINGS'){$('main-dialog').classList.remove('results-mode');$('dialog-title').textContent=title;$('dialog-eyebrow').textContent=eyebrow;$('dialog-body').innerHTML=html;if(!$('main-dialog').open)$('main-dialog').showModal();}
function closeDialog(){$('main-dialog').close();}
function resultsSignature(){return JSON.stringify([state.teams,state.scores,state.rounds.map(r=>[r.finished,r.awarded?.points??null])]);}
function resetResultsState(){clearTimeout(resultsTimer);lastResultsShown='';}
function queueResults(delay=2400){clearTimeout(resultsTimer);if(!getGameResults(state).ready||lastResultsShown===resultsSignature())return;resultsTimer=setTimeout(()=>{if(getGameResults(state).ready&&!$('main-dialog').open&&lastResultsShown!==resultsSignature())showResults();},delay);}
function showResults(page=0,animate=true){
  clearTimeout(resultsTimer);const summary=getGameResults(state),pageSize=window.innerHeight<600?3:window.innerWidth<600?4:5;
  openDialog(summary.ready?'Game results':'Standings',resultsMarkup(summary,{page,pageSize}),summary.ready?'BIRTHDAY FEUD · FINAL RESULTS':'BIRTHDAY FEUD');$('main-dialog').classList.add('results-mode');$('main-dialog').scrollTop=0;
  $('results-board').onclick=closeDialog;
  document.querySelectorAll('[data-results-page]').forEach(button=>button.onclick=()=>showResults(Number(button.dataset.resultsPage),false));
  if($('results-review'))$('results-review').onclick=()=>{const index=summary.pendingRounds[0]??summary.unfinishedRounds[0];closeDialog();if(index!==undefined){setRound(index);if(summary.pendingRounds.length){feedback={type:'info',message:'Assign these earned points to a team before showing final results.'};render();}}};
  if($('results-again'))$('results-again').onclick=()=>{checkpoint();resetResultsState();state={...freshState(dataset.questions.length,state.teams),aliases:state.aliases,sound:state.sound};teamPage=0;feedback=null;save();render();closeDialog();toast('New game started.');};
  if(summary.ready){lastResultsShown=resultsSignature();if(animate){winnerEffects($('main-dialog'));play('award');}}
}
function pasteDialog(){
  openDialog('Import survey',surveyImportMarkup(pasteDraft),'PASTE FROM GOOGLE SHEETS');
  let pending=null;
  function preview(){pasteDraft=$('survey-paste').value;pending=null;const area=$('paste-preview'),select=$('birthday-row');try{if(!pasteDraft.trim()){area.innerHTML='<span>Paste your questions and responses to see a preview.</span>';$('load-paste').disabled=true;return;}const rows=parseTSV(pasteDraft),records=rows.slice(1),selected=select.value;select.innerHTML='<option value="">Enter separately in host controls</option>'+records.map((row,i)=>`<option value="${i}" ${selected===String(i)?'selected':''}>Response ${i+1} (sheet row ${i+2}) · ${esc(row.filter(Boolean).slice(0,2).join(' / ').slice(0,90))}</option>`).join('');pending=tableToDataset(rows,0,{birthdayRow:select.value===''?null:Number(select.value)});area.innerHTML=`<span class="preview-check">✓</span><strong>${pending.questions.length} ${pending.questions.length===1?'question':'questions'}</strong><span>·</span><strong>${pending.respondents} guest ${pending.respondents===1?'response':'responses'}</strong><span>${select.value!==''?' + ✦ birthday answers':'ready to import'}</span>`;$('load-paste').disabled=false;}catch(e){area.textContent=e.message;area.classList.add('error');$('load-paste').disabled=true;}if(pending)area.classList.remove('error');}
  $('survey-paste').addEventListener('input',preview);$('birthday-row').onchange=preview;$('example-paste').onclick=()=>{$('survey-paste').value='Favourite cake?\tBest party snack?\tName a party decoration.\nChocolate\tChips\tBalloons\nVanilla\tPizza\tFlowers\nChocolate\tChips\tBalloons\nRed velvet\tPopcorn\tStreamers\nVanilla\tChips\tBalloons';preview();};
  $('load-paste').onclick=()=>{if(!pending)return;dataset=pending;resetResultsState();teamPage=0;state={...freshState(dataset.questions.length,state.teams),sound:state.sound};history=[];feedback=null;pasteDraft='';save();render();closeDialog();toast(`${dataset.questions.length} questions loaded.`);};preview();
}
function teamsDialog(){
  openDialog('Manage teams',teamsModalMarkup(),'TEAMS');
  let draft=state.teams.map((name,i)=>({name,original:i}));
  function draw(){ $('team-editor').innerHTML=teamEditorMarkup(draft);document.querySelectorAll('[data-team-name]').forEach(input=>input.oninput=()=>draft[Number(input.dataset.teamName)].name=input.value);document.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{draft.splice(Number(button.dataset.remove),1);draw();});}
  $('add-team').onclick=()=>{draft.push({name:'',original:null});draw();document.querySelector('[data-team-name="'+(draft.length-1)+'"]').focus();};
  $('save-teams').onclick=()=>{if(draft.some(team=>!team.name.trim())){$('team-status').textContent='Give each team a name before saving.';return;}checkpoint();const oldTeams=[...state.teams],oldScores=[...state.scores],activeOld=state.activeTeam;for(const r of state.rounds){if(r.awarded?.team!=null){const next=draft.findIndex(team=>team.original===r.awarded.team);r.awarded.teamName=oldTeams[r.awarded.team];r.awarded.team=next<0?null:next;}}state.teams=draft.map(team=>team.name.trim());state.scores=draft.map(team=>team.original===null?0:oldScores[team.original]);const activeNew=draft.findIndex(team=>team.original===activeOld);state.activeTeam=activeNew<0?0:activeNew;feedback=null;save();render();closeDialog();toast(`${state.teams.length} ${state.teams.length===1?'team':'teams'} saved.`);};draw();
}
function howTo(){openDialog('How to play',rulesMarkup(),'HOW TO PLAY');}
function questionList(){openDialog(`${dataset.questions.length} questions`,questionsMarkup(dataset, state),'PICK A QUESTION');document.querySelectorAll('[data-list-round]').forEach(b=>b.onclick=()=>{setRound(Number(b.dataset.listRound));closeDialog();});}
function birthdayDialog(){
  openDialog('Birthday person’s answers',birthdayAnswersMarkup(dataset),'HOST ONLY · BIRTHDAY ANSWERS');
  $('save-birthday').onclick=()=>{checkpoint();let changed=0;document.querySelectorAll('[data-birthday]').forEach(input=>{const i=Number(input.dataset.birthday),value=input.value.trim();if(value!==(dataset.questions[i].birthdayAnswer||'')){const r=state.rounds[i];if(r.awarded?.team!=null)state.scores[r.awarded.team]=Math.max(0,state.scores[r.awarded.team]-r.awarded.points);const one=freshState(1).rounds[0];state.rounds[i]=one;dataset.questions[i].birthdayAnswer=value;changed++;}});history=[];feedback=null;save();render();closeDialog();toast(changed?`${changed} birthday ${changed===1?'answer':'answers'} saved.`:'Birthday answers saved.');};
}
function hostDialog(){
  openDialog('Host controls',hostControlsMarkup(round, history, document.body.classList.contains('presentation')),'HOST CONTROLS');
  $('birthday-picks').onclick=birthdayDialog;
  $('reveal-all').onclick=()=>{checkpoint();freezeRound(state,dataset);answers().forEach((answer,i)=>round().revealed[i]=Boolean(answer));feedback=null;save();render();closeDialog();};
  $('hide-all').onclick=()=>{checkpoint();round().revealed.fill(false);round().attempts=[];feedback=null;save();render();closeDialog();};
  $('reset-round').onclick=()=>{checkpoint();resetCurrentRound(state);feedback=null;save();render();closeDialog();toast('Round reset. Its previous points award was removed.');};
  $('undo').onclick=()=>{state=history.pop();feedback=null;save();render();closeDialog();toast('Last action undone.');};
  $('round-multiplier').onchange=e=>{checkpoint();round().multiplier=Number(e.target.value);save();render();};
  $('group-answers').onclick=groupDialog;$('view-results').onclick=()=>showResults();$('presentation').onclick=()=>{document.body.classList.toggle('presentation');closeDialog();};
  $('backup-game').onclick=()=>download('birthday-feud-backup.json',JSON.stringify({version:2,dataset,state},null,2));
  $('restore-game').onclick=()=>{try{const data=JSON.parse($('restore-text').value),nextDataset=validateDataset(data.dataset),nextState=restoreState(data.state,nextDataset.questions.length);dataset=nextDataset;resetResultsState();state=nextState;history=[];feedback=null;save();render();closeDialog();toast('Game restored.');}catch(e){$('backup-status').textContent=e.message;}};
  let armed=false;$('new-game').onclick=()=>{if(!armed){armed=true;$('new-game').textContent='Click again to reset all scores & rounds';return;}checkpoint();resetResultsState();teamPage=0;state={...freshState(dataset.questions.length,state.teams),aliases:state.aliases,sound:state.sound};feedback=null;save();render();closeDialog();toast('Game reset.');};
  let sampleArmed=false;$('sample-game').onclick=()=>{if(!sampleArmed){sampleArmed=true;$('sample-game').textContent='Click again to start the sample survey';return;}dataset=demoDataset();resetResultsState();teamPage=0;state={...freshState(dataset.questions.length,state.teams),sound:state.sound};history=[];feedback=null;save();render();closeDialog();toast('Playing the sample survey.');};
}
function groupDialog(){
  const aliases=state.aliases[state.index]||{},groups=new Map();for(const [from,to]of Object.entries(aliases)){if(normalize(from)===normalize(to))continue;if(!groups.has(to))groups.set(to,[]);groups.get(to).push(from);}
  const rules=[...groups].map(([canonical,variants])=>canonical+' = '+variants.join(' | ')).join('\n');
  openDialog('Group similar answers',answerGroupsMarkup(rules, dataset, state),'HOST ONLY · ANSWER GROUPS');
  $('save-aliases').onclick=()=>{const next=Object.create(null);for(const line of $('alias-rules').value.split('\n').filter(s=>s.trim())){const at=line.indexOf('='),name=line.slice(0,at).trim(),variants=line.slice(at+1).split('|').map(s=>s.trim()).filter(Boolean);if(at<1||!name||!variants.length){$('alias-status').textContent='Use Display name = alternate | another alternate on each line.';return;}for(const variant of [name,...variants])next[normalize(variant)]=name;}checkpoint();resetCurrentRound(state);state.aliases[state.index]=next;feedback=null;save();render();closeDialog();toast('Answer groups saved.');};
}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('guess-form').onsubmit=e=>{e.preventDefault();guess($('guess-input').value);};
$('guess-team').onchange=e=>{state.activeTeam=Number(e.target.value);teamPage=Math.floor(state.activeTeam/teamPageSize());feedback=null;save();render();$('guess-input').focus();};
$('pass-turn').onclick=()=>{checkpoint();state.activeTeam=(state.activeTeam+1)%state.teams.length;teamPage=Math.floor(state.activeTeam/teamPageSize());round().strikes=0;feedback={type:'info',message:`Your turn, ${state.teams[state.activeTeam]}!`};save();render();$('guess-input').focus();};
$('team-grid').onclick=e=>{const awardButton=e.target.closest('[data-award]'),adjust=e.target.closest('[data-adjust]'),team=e.target.closest('[data-team]');if(awardButton){award(Number(awardButton.dataset.award));return;}if(adjust){const [i,amount]=adjust.dataset.adjust.split(':').map(Number);checkpoint();state.scores[i]=Math.max(0,state.scores[i]+amount);save();render();return;}if(team){state.activeTeam=Number(team.dataset.team);feedback=null;save();render();}};
$('round-picker').onclick=e=>{const button=e.target.closest('[data-round]');if(button)setRound(Number(button.dataset.round));};
$('prev-teams').onclick=()=>{teamPage--;render();};$('next-teams').onclick=()=>{teamPage++;render();};
window.addEventListener('resize',()=>{teamPage=Math.floor(state.activeTeam/teamPageSize());render();if($('main-dialog').open&&$('main-dialog').classList.contains('results-mode'))showResults(0,false);});
$('clear-strikes').onclick=()=>{checkpoint();round().strikes=0;feedback=null;save();render();};
$('prev-round').onclick=()=>setRound(state.index-1);$('next-round').onclick=advanceRound;$('end-round').onclick=()=>getGameResults(state).ready?showResults():endCurrentRound();$('question-list').onclick=questionList;$('host-tools').onclick=hostDialog;$('how-to').onclick=howTo;$('import-survey').onclick=pasteDialog;$('strip-import').onclick=pasteDialog;$('manage-teams').onclick=teamsDialog;$('edit-teams').onclick=teamsDialog;
$('sound-toggle').onclick=()=>{state.sound=!state.sound;save();render();if(state.sound)play();};
$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();document.body.classList.add('presentation');}else{await document.exitFullscreen();document.body.classList.remove('presentation');}}catch{document.body.classList.toggle('presentation');}};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('presentation');});
document.querySelector('.dialog-close').onclick=closeDialog;$('main-dialog').onclick=e=>{if(e.target===$('main-dialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeDialog();}};
document.addEventListener('keydown',e=>{if($('main-dialog').open||e.altKey||e.ctrlKey||e.metaKey||e.repeat||/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();advanceRound();}else if(e.key==='ArrowLeft'){e.preventDefault();setRound(state.index-1);}else if(e.key.toLowerCase()==='m')$('sound-toggle').click();});
render();initEffects();queueResults(800);
