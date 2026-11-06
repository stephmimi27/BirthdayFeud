import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,parseTSV,parseCSV,tableToDataset,topAnswers,demoDataset,validateDataset} from '../src/game/data.js';
import {freshState,roundAnswers,roundPoints,submitGuess,awardPoints,finishRound,resetCurrentRound,removeTeam,restoreState} from '../src/game/engine.js';

test('TSV paste handles quoted tabs, embedded newlines, escaped quotes, BOM and CRLF',()=>{
  assert.deepEqual(parseTSV('\uFEFFFavourite cake?\tBest snack?\r\n"Chocolate\t& vanilla"\t"Say ""cheese"""\r\n"Two\nlines"\tChips\r\n'),[['Favourite cake?','Best snack?'],['Chocolate\t& vanilla','Say "cheese"'],['Two\nlines','Chips']]);
  assert.deepEqual(parseCSV('"Q, one",Q2\nCake,Chips'),[['Q, one','Q2'],['Cake','Chips']]);
  assert.throws(()=>parseTSV('"Unclosed\tquestion'),/unfinished/);
});
test('one, seven, and one hundred questions are accepted without dropping blank cells',()=>{
  for(const count of [1,7,100]){
    const data=tableToDataset([Array.from({length:count},(_,i)=>'Question '+i),Array(count).fill('Cake'),Array(count).fill(' cake ')]);
    assert.equal(data.questions.length,count);assert.equal(data.respondents,2);assert.equal(data.questions[count-1].answers[0].count,2);
    assert.equal(validateDataset(data).questions.length,count);assert.equal(freshState(count).rounds.length,count);
  }
  const sparse=tableToDataset(parseTSV('Q1\tQ2\nCake\t\n\tChips'));
  assert.equal(sparse.questions[0].responses,1);assert.equal(sparse.questions[1].responses,1);assert.equal(sparse.respondents,2);
  assert.throws(()=>tableToDataset([['Q1',''],['Cake','Chips']]),/no question heading/);
  assert.equal(tableToDataset([['Q1','',''],['Cake','','']]).questions.length,1);
});
test('top five rank counts and explicit aliases while excluding blanks and prototype properties',()=>{
  const result=aggregate(['cake',' Cake ','CAKE','birthday cake','Balloons','balloons','Friends','Gifts','Music','Confetti','', '  '],{'birthday cake':'cake'});
  assert.equal(result[0].count,4);assert.equal(result[1].count,2);
  assert.equal(topAnswers({answers:result}).length,5);
  assert.deepEqual(aggregate(['constructor','__proto__','toString']).map(a=>typeof a.text),['string','string','string']);
});
test('birthday row is excluded from guest rankings and fills the special sixth answer',()=>{
  const rows=parseTSV('Favourite cake?\tBest snack?\nMatcha\tSushi\nChocolate\tChips\nChocolate\tPizza\nVanilla\tChips');
  const data=tableToDataset(rows,0,{birthdayRow:0}),state=freshState(2);
  assert.equal(data.respondents,3);assert.equal(data.questions[0].birthdayAnswer,'Matcha');
  assert.deepEqual(data.questions[0].answers,[{text:'Chocolate',count:2},{text:'Vanilla',count:1}]);
  const board=roundAnswers(state,data);assert.equal(board.length,6);assert.equal(board[2],null);assert.equal(board[5].text,'Matcha');assert.equal(board[5].birthday,true);
  assert.equal(submitGuess(state,data,'  MATCHA! ').birthday,true);assert.equal(state.rounds[0].revealed[5],true);assert.equal(roundPoints(state,data),1);
  assert.throws(()=>tableToDataset(rows,0,{birthdayRow:9}),/valid birthday/);
});
test('birthday answer matching a popular answer reveals both tiles without duplicate points',()=>{
  const data=tableToDataset(parseTSV('Q\nCake\nCake\nCake\nChips'),0,{birthdayRow:0}),state=freshState(1);
  const first=submitGuess(state,data,'CAKE');assert.deepEqual(first.indices,[0,5]);assert.equal(first.count,3);assert.equal(roundPoints(state,data),3);
  assert.equal(submitGuess(state,data,'cake!').type,'duplicate');assert.equal(state.rounds[0].strikes,0);assert.equal(roundPoints(state,data),3);
});
test('typed misses, repeats, empty answers, three strikes and completed rounds behave correctly',()=>{
  const data=demoDataset(),state=freshState(data.questions.length);
  assert.equal(submitGuess(state,data,'').type,'empty');
  assert.equal(submitGuess(state,data,'Definitely wrong').type,'wrong');assert.equal(state.rounds[0].strikes,1);
  assert.equal(submitGuess(state,data,'definitely wrong!').type,'duplicate');assert.equal(state.rounds[0].strikes,1);
  submitGuess(state,data,'Wrong two');submitGuess(state,data,'Wrong three');assert.equal(submitGuess(state,data,'Cake').type,'blocked');assert.equal(state.rounds[0].strikes,3);
  state.rounds[0].strikes=0;submitGuess(state,data,'Cake');assert.equal(roundPoints(state,data),22);assert.equal(awardPoints(state,data,1),22);assert.equal(awardPoints(state,data,0),0);assert.equal(state.scores[1],22);assert.equal(submitGuess(state,data,'Balloons').type,'finished');
  resetCurrentRound(state);assert.equal(state.scores[1],0);assert.equal(roundPoints(state,data),0);
});
test('any team count, points multipliers, backups and removal of an awarded team remain valid',()=>{
  const data=demoDataset();
  for(const count of [1,3,12,50]){const teams=Array.from({length:count},(_,i)=>'Team '+i),state=freshState(data.questions.length,teams);submitGuess(state,data,'Cake');state.rounds[0].multiplier=3;assert.equal(awardPoints(state,data,count-1),66);assert.equal(state.scores[count-1],66);assert.equal(restoreState(structuredClone(state),data.questions.length).teams.length,count);}
  const state=freshState(data.questions.length,['A','B','C']);submitGuess(state,data,'Cake');awardPoints(state,data,1);removeTeam(state,1);assert.equal(state.rounds[0].awarded.team,null);resetCurrentRound(state);assert.deepEqual(state.scores,[0,0]);removeTeam(state,1);assert.throws(()=>removeTeam(state,0),/at least one/);
});
test('synonyms match typed guesses and active round results stay frozen',()=>{
  const data=demoDataset(),state=freshState(data.questions.length);state.aliases[0]={'birthday cake':'Cake'};
  assert.equal(submitGuess(state,data,'birthday cake').type,'correct');data.questions[0].answers[0].count=999;assert.equal(roundPoints(state,data),22);
  const one=tableToDataset(parseTSV('Q\nCafé'));const single=freshState(1);assert.equal(submitGuess(single,one,'CAFE!').type,'correct');
});
test('ending a round reveals all six answers and freezes only earned points',()=>{
  const data=demoDataset(),state=freshState(data.questions.length);
  submitGuess(state,data,'Cake');state.rounds[0].multiplier=2;
  assert.equal(roundPoints(state,data),44);
  assert.equal(finishRound(state,data),44);assert.ok(state.rounds[0].revealed.every(Boolean));
  assert.equal(roundAnswers(state,data)[5].birthday,true);assert.equal(roundPoints(state,data),44);
  assert.equal(submitGuess(state,data,'Balloons').type,'finished');assert.equal(finishRound(state,data),44);
  assert.equal(awardPoints(state,data,0),44);assert.equal(state.scores[0],44);assert.equal(awardPoints(state,data,1),0);
  const restored=restoreState(structuredClone(state),data.questions.length);assert.equal(roundPoints(restored,data),44);assert.ok(restored.rounds[0].revealed.every(Boolean));
  resetCurrentRound(state);assert.equal(state.scores[0],0);assert.equal(state.rounds[0].finished,false);
});
test('awarding points ends the round and reveals missed answers without counting them',()=>{
  const data=demoDataset(),state=freshState(data.questions.length);
  submitGuess(state,data,'Cake');assert.equal(awardPoints(state,data,1),22);
  assert.equal(state.rounds[0].finished,true);assert.ok(state.rounds[0].revealed.every(Boolean));
  assert.equal(state.scores[1],22);assert.equal(roundPoints(state,data),22);
});
test('ending a zero-point round reveals only existing answers and supports round reset',()=>{
  const data=tableToDataset(parseTSV('Q\nCake\nCake')),state=freshState(1);
  assert.equal(finishRound(state,data),0);assert.deepEqual(state.rounds[0].revealed,[true,false,false,false,false,false]);
  assert.equal(roundPoints(state,data),0);assert.equal(state.scores[0],0);
  resetCurrentRound(state);assert.ok(state.rounds[0].revealed.every(v=>!v));assert.equal(submitGuess(state,data,'Cake').type,'correct');
});
