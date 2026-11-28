# Site-109 Lockdown

A top-down shooter set in the SCP Foundation universe. Global Occult Coalition strike teams are storming Site-109 to destroy the anomalies in its containment wing. You are the last Nu-7 operative between them and the cells.

## Play

Download the static game ZIP from [GitHub Releases](https://github.com/Site109/site109/releases). Extract it and serve that directory over HTTP or HTTPS. For local play, run `python3 -m http.server 8000 --bind 127.0.0.1` in the extracted directory and open [localhost:8000](http://localhost:8000/).

The existing [Pages site](https://site109.github.io/site109/) remains online as an earlier snapshot. New builds ship through Releases.

- WASD move, mouse aim, left click fire
- Space dash, R reload, 1 to 6 or wheel switch weapons
- Right click or G frag, E defuse charges and resupply at lockers
- Q SCP-500, F SCP-018, C SCP-207, X sentry, Esc pause
- Gamepad and touch are supported

## Installation and offline play

Open the game over HTTPS or on localhost. Once Settings shows **Ready to play offline** you can disconnect and launch either game mode. Use **Install game** in the main menu when offered. On iPhone or iPad open the Share menu and choose **Add to Home Screen**.

When your host serves a newer build, installed copies download it in the background. Choose **Update game** in the main menu to switch immediately, or close all game windows to let the update take effect on the next launch.

## Rules

Sappers plant demolition charges on the blast doors. Two detonations breach a cell and release its anomaly, which hunts both sides until the cell is reinforced in the armory. Lose all three cells, or your operative, and the site is lost. Survive ten waves to secure it, or keep going in Endless protocol.

Coalition troops investigate gunfire and share sightings with nearby units. Break line of sight and change position to slip their search. Breachers move around the front line, shields escort sappers, and adepts protect nearby allies. Sappers favor weak or lightly defended cells. Higher difficulties shorten enemy reaction times and improve their aim against moving targets.

## Code

Game modules live in `src/` and static assets with stable URLs live in `public/`. Use Node 20.19+ or 22.12+, then run `npm ci` to install Vite and TypeScript.

- `npm run dev` serves the TypeScript modules with live reload. The service worker is disabled in this mode.
- `npm run typecheck` checks the game and service worker with strict TypeScript settings.
- `npm run build` checks types and creates the static site in `dist`.
- `npm run preview` serves the production build locally, including PWA features.

Game art and sound are generated at runtime except for the bundled official SCP Foundation logo.

The runtime entry point in `src/main.ts` mounts input, rendering, UI and offline support through one application lifecycle. Each game owns its combat, threat and tactics systems.

A pushed version tag matching `package.json` builds and attaches `site109-<tag>.zip` to a GitHub Release. `dist` and the ZIP are build outputs and are not tracked in Git. Vite uses relative URLs for subdirectory hosting and generates the service worker's cache manifest from each build.

## License

Based on the SCP Foundation (scp-wiki.wikidot.com), licensed under CC BY-SA 3.0. This project is released under the same license.

The bundled Latin fonts use the SIL Open Font License 1.1. [Chakra Petch license](public/fonts/chakra-petch/OFL.txt) · [IBM Plex Mono license](public/fonts/ibm-plex-mono/OFL.txt)

The menu emblem, floor marking, favicon, Apple touch icon and PWA icons use the official SCP Foundation logo listed in [Foundation Iconography](https://scp-wiki.wikidot.com/art:foundation-icons). Original logo by **far2 and Aelanna**; vector by **Dr_Grom and anqxyr**, derived from `logo_250.png`, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). [Original SVG](https://o5command-int.wdfiles.com/local--files/tech-team:graphic-templates/scp-logo.svg). The bundled `public/icons/seal.svg` preserves the official path geometry with editor metadata removed; display variants only adjust color, size and padding. Raster icons include a white background and safe padding for launcher masks.
