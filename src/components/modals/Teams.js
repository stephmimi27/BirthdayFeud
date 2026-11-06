import {escapeHTML as esc} from '../../utils/dom.js';

export function teamsModalMarkup() {
  return `<p class="dialog-intro">Add, rename or remove teams. There is no team limit.</p><div id="team-editor" class="team-editor"></div><button class="add-team-btn" id="add-team">+ Add another team</button><div class="button-row"><button class="primary-btn" id="save-teams">Save your teams <span>→</span></button></div><p class="small-label">Renaming keeps scores. Removing a team removes its score. At least one team is needed to play.</p><div id="team-status" class="inline-status" role="status"></div>`;
}
