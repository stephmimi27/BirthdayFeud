import {escapeHTML as esc} from '../utils/dom.js';

export function questionPickerMarkup({state, dataset, firstRound, pageSize}) {
  return state.rounds.slice(firstRound,firstRound+pageSize).map((r,offset)=>{const i=firstRound+offset;return `<button class="round-number ${i===state.index?'current':''} ${r.finished||r.awarded?'done':''}" data-round="${i}" ${i===state.index?'aria-current="step"':''} title="${esc(dataset.questions[i].text)}" aria-label="Question ${i+1}${r.finished||r.awarded?', round complete':''}">${String(i+1).padStart(2,'0')}</button>`;}).join('');
}
