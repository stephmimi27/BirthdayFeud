import {SAMPLE_QUESTIONS} from '../data/sampleQuestions.js';
export {SAMPLE_QUESTIONS};

export const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function aggregate(items, aliases = {}) {
  const groups = new Map();
  for (const item of items) {
    let text = String(typeof item === 'string' ? item : item.text ?? '').trim().replace(/\s+/g,' ');
    const count = typeof item === 'string' ? 1 : Number(item.count);
    if (!text || !Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) continue;
    text = Object.hasOwn(aliases,normalize(text)) ? String(aliases[normalize(text)]) : text;
    const key = normalize(text), found = groups.get(key);
    if (found) found.count += count; else groups.set(key,{text,count});
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count || a.text.localeCompare(b.text,'en'));
}
export function demoDataset() {
  return {questions:SAMPLE_QUESTIONS.map(([text,choices],i)=>({id:'q'+i,text,responses:64,birthdayAnswer:choices[5],answers:choices.map((text,n)=>({text,count:[22,16,10,7,5,4][n]}))})),respondents:64,source:'demo',updatedAt:null};
}
export function parseDelimited(text, delimiter='\t') {
  text = String(text).replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++;}else if(quoted || !cell)quoted=!quoted;else cell+=c; }
    else if(c===delimiter && !quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('A quoted cell is unfinished. Copy the selected cells from your sheet again.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export const parseCSV = text => parseDelimited(text,',');
export const parseTSV = text => parseDelimited(text,'\t');
export function tableToDataset(rows, firstColumn=0, {birthdayRow=null}={}) {
  if(!Array.isArray(rows)||!rows.length)throw new Error('Paste your question headings and the responses underneath them.');
  const width=rows.reduce((max,row)=>Math.max(max,row.length),0);
  const columns=[];
  for(let i=firstColumn;i<width;i++) {
    const heading=String(rows[0][i]??'').trim();
    const hasAnswers=rows.slice(1).some(row=>String(row[i]??'').trim());
    if(!heading&&hasAnswers)throw new Error(`Column ${i+1} has responses but no question heading. Add a heading in the first row.`);
    if(heading)columns.push({index:i,text:heading});
  }
  if(!columns.length)throw new Error('The first row needs at least one question heading.');
  const allRecords=rows.slice(1).filter(row=>columns.some(col=>String(row[col.index]??'').trim()));
  if(birthdayRow!==null&&(!Number.isInteger(birthdayRow)||birthdayRow<0||birthdayRow>=allRecords.length))throw new Error('Choose a valid birthday response row.');
  const birthday=birthdayRow===null?null:allRecords[birthdayRow];
  const records=allRecords.filter((_,i)=>i!==birthdayRow);
  return {questions:columns.map((col,i)=>{const answers=records.map(row=>String(row[col.index]??'').trim()).filter(Boolean);return{id:'q'+i,text:col.text,responses:answers.length,birthdayAnswer:String(birthday?.[col.index]??'').trim(),answers:aggregate(answers)};}),respondents:records.length,source:'paste',updatedAt:new Date().toISOString()};
}
export function validateDataset(data) {
  if(data?.error)throw new Error(String(data.error));
  if(!data || !Array.isArray(data.questions) || !data.questions.length)throw new Error('Your survey needs at least one question.');
  if(!Number.isInteger(data.respondents)||data.respondents<0)throw new Error('The response count is invalid.');
  return {...data, questions:data.questions.map((q,i)=>{
    if(!q || typeof q.text!=='string'||!q.text.trim()||!Array.isArray(q.answers))throw new Error('Question '+(i+1)+' has an invalid format.');
    const answers=aggregate(q.answers);
    return {id:'q'+i,text:q.text.slice(0,1000),birthdayAnswer:String(q.birthdayAnswer??'').trim(),responses:Number.isInteger(q.responses)?Math.max(0,q.responses):answers.reduce((n,a)=>n+a.count,0),answers};
  })};
}
export function topAnswers(question,aliases={}) { return aggregate(question.answers,aliases).slice(0,5); }
export function columnIndex(letter) {
  if(!/^[A-Z]{1,3}$/i.test(String(letter)))throw new Error('Enter a spreadsheet column letter, such as B or C.');
  return [...letter.toUpperCase()].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
}
