import {escapeHTML as esc} from '../../utils/dom.js';

export function birthdayAnswersMarkup(dataset) {
  return `<p>Enter the birthday person’s answer for each question. These appear in the special sixth slot. You can leave answers blank and add them later.</p><div class="birthday-editor">${dataset.questions.map((q,i)=>`<label class="field"><span class="birthday-question-num">${String(i+1).padStart(2,'0')}</span> ${esc(q.text)}<input data-birthday="${i}" value="${esc(q.birthdayAnswer||'')}" placeholder="The birthday person’s actual answer"></label>`).join('')}</div><p class="notice">Changing an answer resets that question’s round and removes its previous points award. Other rounds keep their progress.</p><button class="primary-btn" id="save-birthday">Save birthday answers <span>✦</span></button>`;
}
