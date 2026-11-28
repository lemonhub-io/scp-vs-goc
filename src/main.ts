import * as core from './core';
import * as data from './data';
import * as translations from './i18n';
import './pwa';
import { audio } from './audio';
import { input } from './input';
import { map, TILE } from './map';
import { fx } from './fx';
import { Operation } from './game';
import './combat';
import './enemy-ai';
import './threats';
import { art } from './art';
import { renderer } from './render';
import { session } from './session';
import { ui } from './ui';

// Keep the existing developer console entry point while modules use explicit imports.
Object.defineProperty(window, 'G', {
  value: {
    ...core, ...data, ...translations, audio, input, map, TILE, fx, Operation, art, renderer,
    show: ui.show,
    get state() { return session.state; },
    get run() { return ui.run; },
  },
});
