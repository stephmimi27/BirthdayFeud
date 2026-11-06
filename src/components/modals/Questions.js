import {escapeHTML as esc} from '../../utils/dom.js';

export function questionsMarkup(dataset, state) {
  return `<div class="question-list">${dataset.questions.map((q,i)=>`<button data-list-round="${i}" class="${i===state.index?'current':''}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(q.text)}</span></button>`).join('')}</div>`;
}
