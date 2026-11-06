import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTSV,tableToDataset} from '../src/game/data.js';
import {freshState,submitGuess,finishRound,awardPoints,getGameResults,restoreState} from '../src/game/engine.js';
import {resultsMarkup} from '../src/components/results.js';

const survey=()=>tableToDataset(parseTSV('Snack?\tCake?\nChips\tChocolate\nChips\tChocolate\nPizza\tVanilla'));
function playRound(state,data,index,guess,team,multiplier=1){state.index=index;state.rounds[index].multiplier=multiplier;submitGuess(state,data,guess);awardPoints(state,data,team);}

test('the highest final score wins after all rounds and point assignments are complete',()=>{
  const data=survey(),state=freshState(2,['First team','Second team']);
  playRound(state,data,0,'Chips',0);assert.equal(getGameResults(state).ready,false);
  playRound(state,data,1,'Chocolate',1,2);
  const result=getGameResults(state);assert.equal(result.ready,true);assert.equal(result.kind,'winner');assert.deepEqual(result.winners.map(w=>w.team),[1]);assert.equal(result.winningScore,4);assert.deepEqual(result.rankings.map(r=>r.score),[4,2]);
  assert.equal(getGameResults(restoreState(structuredClone(state),2)).kind,'winner');
});
test('equal highest scores produce tied winners without choosing an arbitrary team',()=>{
  const data=survey(),state=freshState(2,['Team A','Team B']);playRound(state,data,0,'Chips',0);playRound(state,data,1,'Chocolate',1);
  const result=getGameResults(state);assert.equal(result.kind,'tie');assert.deepEqual(result.winners.map(w=>w.name),['Team A','Team B']);assert.equal(result.winningScore,2);assert.deepEqual(result.rankings.map(r=>r.rank),[1,1]);
});
test('unassigned earned points prevent a premature winner announcement',()=>{
  const data=survey(),state=freshState(2);submitGuess(state,data,'Chips');finishRound(state,data);playRound(state,data,1,'Chocolate',1);
  let result=getGameResults(state);assert.equal(result.completedRounds,2);assert.equal(result.ready,false);assert.deepEqual(result.pendingRounds,[0]);assert.equal(result.kind,'in_progress');assert.deepEqual(result.winners,[]);
  state.index=0;awardPoints(state,data,0);result=getGameResults(state);assert.equal(result.ready,true);assert.equal(result.kind,'tie');assert.deepEqual(state.scores,[2,2]);
});
test('zero-point games finish without naming a false winner and one-team games work',()=>{
  const data=survey(),zero=freshState(2);finishRound(zero,data);zero.index=1;finishRound(zero,data);
  const result=getGameResults(zero);assert.equal(result.ready,true);assert.equal(result.kind,'no_score');assert.equal(result.winners.length,0);
  const single=freshState(2,['Only team']);playRound(single,data,0,'Chips',0);playRound(single,data,1,'Chocolate',0);assert.equal(getGameResults(single).kind,'winner');assert.equal(getGameResults(single).winningScore,4);
});
test('standings support many teams and use equal ranks for equal scores',()=>{
  const data=tableToDataset(parseTSV('Q\nAnswer')),state=freshState(1,Array.from({length:8},(_,i)=>'Team '+i));finishRound(state,data);state.scores=[9,14,14,1,0,7,14,2];
  const result=getGameResults(state);assert.deepEqual(result.rankings.map(r=>r.team),[1,2,6,0,5,7,3,4]);assert.deepEqual(result.rankings.map(r=>r.rank),[1,1,1,4,5,6,7,8]);assert.deepEqual(result.winners.map(r=>r.team),[1,2,6]);
  const html=resultsMarkup(result,{page:1,pageSize:3});assert.equal((html.match(/class="results-score-row /g)||[]).length,3);assert.match(html,/Page 2 of 3/);
});
test('results escape team names and do not label incomplete games as final',()=>{
  const state=freshState(1,['<img src=x onerror=alert(1)>','Safe team']);const html=resultsMarkup(getGameResults(state));
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.match(html,/GAME IN PROGRESS/);assert.ok(!html.includes('id="results-again"'));
});
