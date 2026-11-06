import {escapeHTML as esc} from '../utils/dom.js';

export function teamEditorMarkup(draft) {
  return draft.map((team,i)=>`<div class="team-editor-row"><span class="editor-number">${String(i+1).padStart(2,'0')}</span><input aria-label="Team ${i+1} name" data-team-name="${i}" value="${esc(team.name)}" placeholder="Give this team a name"><button class="remove-team" data-remove="${i}" ${draft.length===1?'disabled':''} aria-label="Remove team ${i+1}">×</button></div>`).join('');
}
