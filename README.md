# Site-109 Lockdown

A top-down shooter set in the SCP Foundation universe. Global Occult Coalition strike teams are storming Site-109 to destroy the anomalies in its containment wing. You are the last Nu-7 operative between them and the cells.

## Play

No build step. Open `index.html` in a modern browser, or serve the folder with any static server (for example `python3 -m http.server`).

- WASD move, mouse aim, left click fire
- Space dash, R reload, 1 to 6 or wheel switch weapons
- Right click or G frag, E defuse charges and resupply at lockers
- Q SCP-500, F SCP-018, C SCP-207, X sentry, Esc pause
- Gamepad and touch are supported

## Rules

Sappers plant demolition charges on the blast doors. Two detonations breach a cell and release its anomaly, which hunts both sides until the cell is reinforced in the armory. Lose all three cells, or your operative, and the site is lost. Survive ten waves to secure it, or keep going in Endless protocol.

## Code

Plain scripts sharing one `G` namespace, loaded in order from `index.html`:
`core` `data` `i18n` `audio` `input` `map` `fx` `game` `combat` `threats` `art` `render` `ui`.
All art and sound are generated at runtime.

## License

Based on the SCP Foundation (scp-wiki.wikidot.com), licensed under CC BY-SA 3.0. This project is released under the same license.
