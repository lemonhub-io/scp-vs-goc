# Site-109 Lockdown

A top-down shooter set in the SCP Foundation universe. Global Occult Coalition strike teams are storming Site-109 to destroy the anomalies in its containment wing. You are the last Nu-7 operative between them and the cells.

## Play

No build step. Open `index.html` in a modern browser, or serve the folder with any static server (for example `python3 -m http.server`).

- WASD move, mouse aim, left click fire
- Space dash, R reload, 1 to 6 or wheel switch weapons
- Right click or G frag, E defuse charges and resupply at lockers
- Q SCP-500, F SCP-018, C SCP-207, X sentry, Esc pause
- Gamepad and touch are supported

## Installation and offline play

Open the game over HTTPS or on localhost. Once Settings shows **Ready to play offline** you can disconnect and launch either game mode. Use **Install game** in the main menu when offered. On iPhone or iPad open the Share menu and choose **Add to Home Screen**.

New releases download in the background. Choose **Update game** in the main menu to switch immediately, or close all game windows to let the update take effect on the next launch.

## Rules

Sappers plant demolition charges on the blast doors. Two detonations breach a cell and release its anomaly, which hunts both sides until the cell is reinforced in the armory. Lose all three cells, or your operative, and the site is lost. Survive ten waves to secure it, or keep going in Endless protocol.

## Code

Plain scripts sharing one `G` namespace, loaded in order from `index.html`:
`core` `data` `i18n` `audio` `input` `map` `fx` `game` `combat` `threats` `art` `render` `ui`.
Game art and sound are generated at runtime except for the bundled official SCP Foundation logo.

For static hosting, deploy the whole directory together. The manifest and service worker use relative paths so the game can also live under a project subdirectory. When releasing changes to cached assets, bump the release in `sw.js` and add any new runtime files to its asset list.

## License

Based on the SCP Foundation (scp-wiki.wikidot.com), licensed under CC BY-SA 3.0. This project is released under the same license.

The bundled Latin fonts use the SIL Open Font License 1.1. [Chakra Petch license](fonts/chakra-petch/OFL.txt) · [IBM Plex Mono license](fonts/ibm-plex-mono/OFL.txt)

The menu emblem, floor marking, favicon, Apple touch icon and PWA icons use the official SCP Foundation logo listed in [Foundation Iconography](https://scp-wiki.wikidot.com/art:foundation-icons). Original logo by **far2 and Aelanna**; vector by **Dr_Grom and anqxyr**, derived from `logo_250.png`, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). [Original SVG](https://o5command-int.wdfiles.com/local--files/tech-team:graphic-templates/scp-logo.svg). The bundled `icons/seal.svg` preserves the official path geometry with editor metadata removed; display variants only adjust color, size and padding. Raster icons include a white background and safe padding for launcher masks.
