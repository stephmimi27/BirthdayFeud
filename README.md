# Birthday Feud

A birthday Family Feud game with a white pixel greenhouse, hanging plants, fine lace, sparkles and a winner celebration. Paste survey responses from Google Sheets, type guesses, and award round points to any number of teams.

## Run locally

Install Node.js 24, then run:

```bash
npm ci
npm run dev
```

Open the local address printed in the terminal (normally `http://localhost:4173`). Source edits rebuild automatically; refresh the page to see them. The project uses standard browser JavaScript and Node's built-in tools, with no third-party runtime dependencies.

```bash
npm test         # survey parsing, game rules and results
npm run check    # JavaScript syntax checks
npm run verify   # production build and asset/import verification
npm run build    # generate dist/ for hosting
npm run preview  # serve the production build locally
```

## Deploy to Vercel

1. Unzip the source package. Upload the **contents** of `birthday-feud/` into the root of a GitHub repository, including `package.json`, `package-lock.json`, `vercel.json`, `src/`, `public/` and `scripts/`.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Use these settings. The included `vercel.json` already supplies the commands and output folder.

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | `./` (the folder containing `package.json`) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x |
| Environment variables | None required |

4. Deploy. Subsequent commits to the connected production branch can be deployed by Vercel.

Do not choose `src/`, `public/` or `dist/` as the project root. `dist/` is generated during the build and is intentionally excluded from the source package.

### Move an existing game to the new URL

Saved data belongs to each browser and website address. Your existing Sites game will not automatically appear at a new Vercel address.

On the old game, open **Host controls → Back up or restore your game → Download game backup**. Open that JSON file as text. On the new game, open the same panel, paste the complete file contents, and choose **Restore game backup**. This moves questions, birthday answers, teams, scores and progress.

## Where to edit

The project is split into folders so individual parts can be edited without searching through one large HTML file.

| Location | Purpose |
| --- | --- |
| `index.html` | Small page shell, CSS links and script entry |
| `src/pages/game.html` | Game page layout and decorations |
| `src/components/*.html` | Header, footer and dialog shell |
| `src/components/*.js` | Answer board, team cards, question navigation and results |
| `src/components/modals/` | Survey import, teams, rules and host panels |
| `src/app.js` | Connects UI events to the game and renders state |
| `src/game/data.js` | TSV parsing, answer grouping and survey validation |
| `src/game/engine.js` | Guesses, strikes, round scores, awards and winners |
| `src/data/sampleQuestions.js` | Demo survey; imported surveys have no question limit |
| `src/state/storage.js` | Browser persistence |
| `src/effects/animations.js` | Sparkles, answer effects and celebrations |
| `src/styles/` | Separate base, layout, board, teams, dialogs, responsive, effects and results CSS |
| `src/utils/dom.js` | Small shared DOM and text helpers |
| `public/assets/` | SVG icons, lace decorations and pixel font |
| `scripts/` | Build, local server and validation tools |
| `tests/` | Survey and game regression tests |
| `tools/make_pixel_font.py` | Optional utility for regenerating the bundled pixel font |
| `vercel.json` | Vercel build settings |

The build expands `<!-- @include ... -->` markers from the root HTML file, copies JavaScript and CSS, and adds public assets to `dist/`. Raw component HTML files are build inputs. Edit source files, not generated `dist/` files.

CSS loads in this order: base, layout, board, teams, dialogs, responsive, effects, results. Preserve that order when changing the page shell.

## Import your survey

Copy a rectangular selection from Google Sheets and paste it under **Import survey**. The first row is question headings, with responses underneath each question. Select question columns only; leave out timestamps and email addresses. Quoted tabs, embedded newlines and escaped quotation marks are supported.

There is no fixed question count. Blank responses and entirely empty columns are ignored. A column with responses but no heading gives an error. Loading a new survey resets scores and rounds while keeping current team names.

If the birthday person's responses are in the sheet, select their row in the dropdown. That row supplies their answers and is excluded from guest rankings. Otherwise enter them under **Host controls → The birthday person's answers**. Pasting imports a snapshot; paste again to update responses. No Google sign-in or live spreadsheet connection is needed.

## Play

Slots 1–5 show the most popular distinct guest answers, with ties sorted alphabetically. Sparkly slot 6 is the birthday person's actual answer, worth one birthday vote. If it also appears in the top five, a matching guess reveals both slots and counts each slot once. Round multipliers apply to earned votes.

Choose an active team, type an answer and press Enter. Matching ignores case, extra spaces, punctuation and accents. Correct answers reveal tiles; misses add a strike; repeated guesses do not add strikes. Use **Pass the turn** after three strikes. Custom synonyms can be added under **Host controls → Group similar answers**.

Use **+ Award** on a team card to assign the earned round points. Each round can be awarded once. Awarding or choosing **End round** reveals all remaining answers; those final reveals add no points. The next-question control first ends an unfinished round, then advances on the next click.

Add, rename and remove teams using **Teams**. There is no fixed team limit. Renaming preserves scores. At least one team is required. The board, guesses and navigation fit one viewport; large question and team sets use pages. Setup dialogs can scroll internally.

## Winners

After every round is complete and all earned points are assigned, the game shows a trophy, sparkles, confetti and final standings. Equal highest scores produce tied winners. A zero-point game shows completion without naming a false winner. Standings page through large team sets.

Use **View results** or **Host controls → View standings / results** to reopen the screen. Unfinished rounds or unassigned points keep it in standings mode with a way to review the relevant round. **Back to board** preserves the game. **Play again** keeps questions, birthday answers, teams and answer groups while clearing scores and round progress.

## Saved data and accessibility

Survey answer counts, birthday answers, team names, scores and progress are saved in localStorage in the current browser/profile and website address. Closing the browser normally preserves them. Clearing site data removes them. Devices and browsers do not sync automatically. Raw pasted response rows are not retained. Use game backups when moving data.

There is no backend, account system or secret configuration in this project. The game follows the device's reduced-motion preference to disable decoration movement and celebration particles. Sound is optional. Keyboard shortcuts: Enter submits a guess; left/right arrows change rounds outside inputs; M toggles sound; Escape closes a panel.
