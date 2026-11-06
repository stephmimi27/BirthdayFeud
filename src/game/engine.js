import {normalize,topAnswers} from './data.js';

export const blankRound=()=>({revealed:Array(6).fill(false),strikes:0,multiplier:1,awarded:null,snapshot:null,attempts:[],finished:false,earnedPoints:null});
export function freshState(count,teams=['Team 1','Team 2']) {
  if(!Number.isInteger(count)||count<1)throw new Error('Add at least one question.');
  if(!teams.length)throw new Error('Add at least one team.');
  return {version:2,index:0,activeTeam:0,scores:teams.map(()=>0),teams:[...teams],rounds:Array.from({length:count},blankRound),aliases:{},sound:false};
}
export const matchKey=value=>normalize(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function classifyGuess(guess,answers,round,aliases={}) {
  const text=String(guess??'').trim(),key=matchKey(text);
  if(!key)return{type:'empty',message:'Type an answer first.'};
  if(round.awarded||round.finished)return{type:'finished',message:'This round is complete. Pick the next question.'};
  if(round.strikes>=3)return{type:'blocked',message:'Three strikes! Pass the turn to another team.'};
  let canonical=text;
  for(const [from,to]of Object.entries(aliases))if(matchKey(from)===key){canonical=to;break;}
  const canonicalKey=matchKey(canonical);
  const matching=answers.flatMap((answer,index)=>{if(!answer)return[];const value=Object.hasOwn(aliases,normalize(answer.text))?aliases[normalize(answer.text)]:answer.text;return matchKey(value)===canonicalKey?[index]:[];});
  const indices=matching.filter(index=>!round.revealed[index]);
  if(matching.length&&!indices.length)return{type:'duplicate',message:'That answer has already been revealed.',index:matching[0],key};
  if((round.attempts||[]).some(attempt=>attempt.key===key))return{type:'duplicate',message:'You already tried that answer. Try another!',key};
  if(indices.length)return{type:'correct',index:indices[0],indices,key,text:answers[indices[0]].text,count:indices.reduce((n,i)=>n+answers[i].count,0),birthday:indices.includes(5)};
  return{type:'wrong',key,message:'Not on the board. One strike.'};
}
export const currentRound=state=>state.rounds[state.index];
export function roundAnswers(state,dataset){const r=currentRound(state);if(r.snapshot)return r.snapshot.answers;const q=dataset.questions[state.index],ranked=topAnswers(q,state.aliases[state.index]);return [...Array.from({length:5},(_,i)=>ranked[i]||null),q.birthdayAnswer?{text:q.birthdayAnswer,count:1,birthday:true}:null];}
export function roundPoints(state,dataset){const r=currentRound(state);if(r.awarded)return r.awarded.points;if(r.finished&&r.earnedPoints!==null)return r.earnedPoints;return roundAnswers(state,dataset).reduce((n,a,i)=>n+(r.revealed[i]&&a?a.count:0),0)*r.multiplier;}
export function freezeRound(state,dataset){const r=currentRound(state);if(!r.snapshot)r.snapshot={...structuredClone(dataset.questions[state.index]),answers:roundAnswers(state,dataset)};}
export function finishRound(state,dataset){
  const r=currentRound(state);
  if(!r.finished)r.earnedPoints=roundPoints(state,dataset);
  freezeRound(state,dataset);r.finished=true;r.revealed=roundAnswers(state,dataset).map(Boolean);
  return r.earnedPoints;
}
export function submitGuess(state,dataset,value){
  const r=currentRound(state),result=classifyGuess(value,roundAnswers(state,dataset),r,state.aliases[state.index]);
  if(result.type==='correct'){freezeRound(state,dataset);result.indices.forEach(index=>r.revealed[index]=true);r.attempts.push({key:result.key,result:'correct'});}
  if(result.type==='wrong'){freezeRound(state,dataset);r.strikes++;r.attempts.push({key:result.key,result:'wrong'});}
  return result;
}
export function awardPoints(state,dataset,team){
  if(!Number.isInteger(team)||team<0||team>=state.teams.length)throw new Error('Choose a team.');
  const r=currentRound(state),points=roundPoints(state,dataset);
  if(r.awarded||!points)return 0;
  r.awarded={team,points,teamName:state.teams[team]};state.scores[team]+=points;finishRound(state,dataset);return points;
}
export function resetCurrentRound(state){const r=currentRound(state);if(r.awarded?.team!=null)state.scores[r.awarded.team]=Math.max(0,state.scores[r.awarded.team]-r.awarded.points);state.rounds[state.index]=blankRound();}
export function removeTeam(state,index){
  if(state.teams.length<=1)throw new Error('Keep at least one team.');
  state.teams.splice(index,1);state.scores.splice(index,1);
  for(const r of state.rounds){if(r.awarded?.team===index)r.awarded={...r.awarded,team:null};else if(r.awarded?.team>index)r.awarded.team--;}
  if(state.activeTeam>index)state.activeTeam--;state.activeTeam=Math.min(state.activeTeam,state.teams.length-1);
}
export function getGameResults(state){
  const unfinishedRounds=[],pendingRounds=[];
  state.rounds.forEach((round,index)=>{
    if(!round.finished&&!round.awarded)unfinishedRounds.push(index);
    else if(!round.awarded&&(round.earnedPoints||0)>0)pendingRounds.push(index);
  });
  const ready=unfinishedRounds.length===0&&pendingRounds.length===0;
  const rankings=state.teams.map((name,team)=>({name,team,score:state.scores[team]})).sort((a,b)=>b.score-a.score||a.team-b.team);
  let lastScore=null,lastRank=0;
  rankings.forEach((row,index)=>{if(row.score!==lastScore)lastRank=index+1;row.rank=lastRank;lastScore=row.score;});
  const winningScore=rankings[0]?.score||0;
  const winners=ready&&winningScore>0?rankings.filter(row=>row.score===winningScore):[];
  const kind=!ready?'in_progress':!winningScore?'no_score':winners.length>1?'tie':'winner';
  return {ready,kind,rankings,winners,winningScore,unfinishedRounds,pendingRounds,completedRounds:state.rounds.length-unfinishedRounds.length,totalRounds:state.rounds.length,totalTeams:state.teams.length};
}
export function restoreState(saved,count){
  if(!saved||saved.rounds?.length!==count||!Array.isArray(saved.teams)||!saved.teams.length||!Array.isArray(saved.scores)||saved.scores.length!==saved.teams.length)throw new Error('This backup does not match its questions and teams.');
  const result={...freshState(count),...saved,version:2};
  if(!result.aliases||typeof result.aliases!=='object'||Array.isArray(result.aliases))throw new Error('This backup has invalid answer groups.');
  result.teams=saved.teams.map(name=>String(name).trim()||'Team');
  result.scores=saved.scores.map(n=>{if(!Number.isSafeInteger(n)||n<0)throw new Error('This backup has an invalid score.');return n;});
  result.index=Math.min(count-1,Math.max(0,Number(saved.index)||0));
  result.activeTeam=Math.min(result.teams.length-1,Math.max(0,Number(saved.activeTeam)||0));
  result.rounds=saved.rounds.map(r=>{
    if(!r||!Array.isArray(r.revealed)||r.revealed.length!==6||!r.revealed.every(v=>typeof v==='boolean')||![1,2,3].includes(r.multiplier)||!Number.isInteger(r.strikes)||r.strikes<0||r.strikes>3)throw new Error('This backup has invalid round data.');
    if(r.awarded&&((r.awarded.team!==null&&(!Number.isInteger(r.awarded.team)||r.awarded.team<0||r.awarded.team>=result.teams.length))||!Number.isSafeInteger(r.awarded.points)||r.awarded.points<0))throw new Error('This backup has an invalid points award.');
    if(r.snapshot&&(!Array.isArray(r.snapshot.answers)||r.snapshot.answers.length>6||typeof r.snapshot.text!=='string'||!r.snapshot.answers.every(a=>a===null||(typeof a.text==='string'&&Number.isInteger(a.count)&&a.count>0))))throw new Error('This backup has invalid answer data.');
    if(r.finished!==undefined&&typeof r.finished!=='boolean')throw new Error('This backup has an invalid round status.');
    if(r.finished&&!r.awarded&&(!Number.isSafeInteger(r.earnedPoints)||r.earnedPoints<0))throw new Error('This backup has invalid earned points.');
    const restored={...blankRound(),...r,finished:Boolean(r.finished||r.awarded),earnedPoints:r.awarded?.points??r.earnedPoints??null,attempts:Array.isArray(r.attempts)?r.attempts:[]};
    if(saved.version!==2&&restored.snapshot){restored.snapshot={...restored.snapshot,answers:[...restored.snapshot.answers.slice(0,5),null]};restored.revealed[5]=false;}
    if(restored.finished&&restored.snapshot)restored.revealed=restored.snapshot.answers.map(Boolean);
    return restored;
  });
  return result;
}
