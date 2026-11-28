"use strict";
/* Generated browser script from src/audio.ts. Edit the TypeScript source. */
var G;
(function (G) {
    G.audio = (() => {
        const listener = { x: 0, y: 0 };
        let ctx = null;
        let master, sfx, music, ui;
        let verbSend, noiseBuf;
        let last = {};
        const STARTUP_WINDOW = 250;
        // iPad can present a desktop Safari user agent even in a Home Screen app.
        const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const homeScreen = navigator.standalone === true ||
            (appleMobile && window.matchMedia('(display-mode: standalone)').matches);
        let resumeAt = -Infinity;
        let pendingSounds = [];
        let outputCheck = 0, rebuildOnInput = false, primeAt = -Infinity;
        function setPlaybackSession(active) {
            const session = homeScreen && navigator.audioSession;
            if (!session)
                return;
            const { master, sfx, music } = G.settings;
            const type = active && master > 0 && (sfx > 0 || music > 0) ? 'playback' : 'auto';
            // Web Audio defaults to ambient on iPadOS, which can be silenced by the system.
            try {
                if (session.type !== type)
                    session.type = type;
            }
            catch { /* optional Safari API */ }
        }
        function checkOutputClock(context) {
            if (!homeScreen || outputCheck)
                return;
            const time = context.currentTime;
            outputCheck = setTimeout(() => {
                outputCheck = 0;
                if (ctx !== context || document.hidden)
                    return;
                // WebKit can report running even when the rendering clock has stopped.
                rebuildOnInput = context.state !== 'running' || context.currentTime <= time;
            }, 450);
        }
        function primeOutput() {
            const now = performance.now();
            if (!ctx || !homeScreen || now - primeAt < 100)
                return;
            primeAt = now;
            const source = ctx.createBufferSource();
            source.buffer = ctx.createBuffer(1, 128, ctx.sampleRate);
            source.connect(ctx.destination);
            source.onended = () => source.disconnect();
            source.start();
        }
        function replaceContext() {
            const old = ctx;
            if (!old)
                return;
            ctx = null;
            siren = null;
            last = {};
            primeAt = -Infinity;
            rebuildOnInput = false;
            clearTimeout(outputCheck);
            outputCheck = 0;
            if (old.state !== 'closed')
                old.close().catch(() => { });
        }
        function flushPending() {
            if (document.hidden || ctx?.state !== 'running')
                return;
            const now = performance.now();
            const sounds = pendingSounds;
            pendingSounds = [];
            for (const sound of sounds) {
                if (now - sound.at <= STARTUP_WINDOW)
                    play(sound.name, sound.opts);
            }
        }
        function resume(force = false) {
            if (!ctx || ctx.state === 'closed' || document.hidden)
                return;
            setPlaybackSession(true);
            checkOutputClock(ctx);
            if (ctx.state === 'running' && !force)
                return;
            resumeAt = performance.now();
            pendingSounds = pendingSounds.filter(sound => resumeAt - sound.at <= STARTUP_WINDOW);
            // Call synchronously so a pointer or key event can authorize playback.
            const context = ctx;
            context.resume().then(() => { if (ctx === context)
                flushPending(); }, () => { });
        }
        function init(trusted = false) {
            if (document.hidden)
                return;
            if (trusted && ctx && (rebuildOnInput || ctx.state === 'closed'))
                replaceContext();
            if (ctx) {
                if (trusted && ctx.state !== 'running')
                    primeOutput();
                resume();
                return;
            }
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC)
                return;
            setPlaybackSession(true);
            try {
                ctx = new AC();
            }
            catch {
                return;
            }
            const context = ctx;
            context.addEventListener('statechange', () => { if (ctx === context)
                flushPending(); });
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -16;
            comp.knee.value = 12;
            comp.ratio.value = 5;
            comp.attack.value = 0.004;
            comp.release.value = 0.2;
            master = ctx.createGain();
            master.connect(comp);
            comp.connect(ctx.destination);
            sfx = ctx.createGain();
            sfx.connect(master);
            music = ctx.createGain();
            music.connect(master);
            ui = ctx.createGain();
            ui.connect(master);
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++)
                d[i] = Math.random() * 2 - 1;
            // facility reverb
            const verb = ctx.createConvolver();
            const len = ctx.sampleRate * 2.4;
            const ir = ctx.createBuffer(2, len, ctx.sampleRate);
            for (let c = 0; c < 2; c++) {
                const ch = ir.getChannelData(c);
                for (let i = 0; i < len; i++)
                    ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
            }
            verb.buffer = ir;
            verbSend = ctx.createGain();
            verbSend.gain.value = 0.22;
            verbSend.connect(verb);
            verb.connect(sfx);
            setVolumes(true);
            if (trusted)
                primeOutput();
            startMusic(ctx);
            if (sirenWanted)
                setSiren(true);
            resume(true);
        }
        function setVolumes(initial = false) {
            if (!ctx)
                return;
            setPlaybackSession(!document.hidden);
            const s = G.settings;
            const time = ctx.currentTime;
            const volume = (node, value) => {
                if (initial)
                    node.gain.value = value;
                else
                    node.gain.setTargetAtTime(value, time, 0.05);
            };
            volume(master, s.master);
            volume(sfx, s.sfx);
            volume(ui, s.sfx * 0.9);
            volume(music, s.music * 0.55);
        }
        function unlockOnInput(event) {
            if (!event.isTrusted || (event instanceof KeyboardEvent && event.repeat))
                return;
            if ('pointerType' in event) {
                if (event.type === 'pointerdown' && event.pointerType !== 'mouse')
                    return;
                if (event.type === 'pointerup' && event.pointerType === 'mouse')
                    return;
            }
            init(true);
        }
        for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) {
            document.addEventListener(type, unlockOnInput, { capture: true, passive: true });
        }
        document.addEventListener('touchend', unlockOnInput, { capture: true, passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pendingSounds = [];
                clearTimeout(outputCheck);
                outputCheck = 0;
                if (ctx && ctx.state !== 'closed')
                    ctx.suspend().catch(() => { });
                setPlaybackSession(false);
            }
            else {
                // Request resume even if the earlier suspend is still taking effect.
                resume(true);
            }
        });
        window.addEventListener('pageshow', () => resume());
        /* building blocks */
        function out(ctx, dest, pan, vol, wet) {
            const g = ctx.createGain();
            g.gain.value = vol;
            let node = g;
            if (pan && ctx.createStereoPanner) {
                const p = ctx.createStereoPanner();
                p.pan.value = G.clamp(pan, -1, 1);
                g.connect(p);
                node = p;
            }
            node.connect(dest);
            if (wet)
                node.connect(verbSend);
            return g;
        }
        function noise(t, dur, type, f0, f1, q, gain, dest, attack = 0.002) {
            const ctx = dest.context;
            const src = ctx.createBufferSource();
            src.buffer = noiseBuf;
            src.playbackRate.value = 0.8 + Math.random() * 0.4;
            const f = ctx.createBiquadFilter();
            f.type = type;
            f.Q.value = q;
            f.frequency.setValueAtTime(f0, t);
            if (f1 !== f0)
                f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(f);
            f.connect(g);
            g.connect(dest);
            src.start(t, Math.random() * 1.5);
            src.stop(t + dur + 0.05);
        }
        function tone(t, type, f0, f1, dur, gain, dest, attack = 0.002) {
            const ctx = dest.context;
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.setValueAtTime(f0, t);
            if (f1 !== f0)
                o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g);
            g.connect(dest);
            o.start(t);
            o.stop(t + dur + 0.05);
        }
        const SOUNDS = {
            pistol(t, d) { noise(t, 0.14, 'bandpass', 2400, 900, 0.8, 0.55, d); tone(t, 'sine', 190, 55, 0.1, 0.55, d); },
            rifle(t, d) { noise(t, 0.1, 'highpass', 1100, 700, 0.6, 0.45, d); noise(t, 0.07, 'bandpass', 600, 300, 1, 0.4, d); tone(t, 'sine', 150, 50, 0.08, 0.5, d); },
            shotgun(t, d) { noise(t, 0.36, 'lowpass', 3400, 500, 0.7, 0.9, d); tone(t, 'sine', 120, 38, 0.25, 0.85, d); noise(t + 0.25, 0.05, 'bandpass', 2500, 2500, 3, 0.12, d); },
            lmg(t, d) { noise(t, 0.12, 'bandpass', 1300, 600, 0.7, 0.55, d); tone(t, 'sine', 130, 45, 0.1, 0.6, d); },
            tesla(t, d) { tone(t, 'sawtooth', 1400, 220, 0.13, 0.13, d); noise(t, 0.09, 'highpass', 3500, 2000, 0.5, 0.3, d); tone(t, 'square', 90, 60, 0.08, 0.08, d); },
            rail(t, d) { tone(t, 'sine', 500, 2600, 0.07, 0.12, d); noise(t + 0.03, 0.5, 'lowpass', 7000, 400, 0.6, 0.85, d); tone(t + 0.03, 'sine', 75, 28, 0.45, 0.8, d); tone(t + 0.03, 'triangle', 1800, 900, 0.3, 0.08, d); },
            enemy(t, d) { noise(t, 0.09, 'bandpass', 3000, 1500, 1.4, 0.32, d); tone(t, 'square', 950, 280, 0.06, 0.05, d); tone(t, 'sine', 160, 70, 0.06, 0.25, d); },
            eshotgun(t, d) { noise(t, 0.28, 'lowpass', 2600, 500, 0.8, 0.6, d); tone(t, 'sine', 110, 45, 0.2, 0.5, d); },
            sniper(t, d) { noise(t, 0.3, 'bandpass', 1900, 500, 0.7, 0.8, d); tone(t, 'sine', 95, 35, 0.25, 0.7, d); tone(t, 'sine', 3200, 1600, 0.12, 0.06, d); },
            minigun(t, d) { noise(t, 0.06, 'bandpass', 1800, 900, 0.9, 0.4, d); tone(t, 'sine', 120, 60, 0.05, 0.35, d); },
            orb(t, d) { tone(t, 'sine', 420, 980, 0.28, 0.14, d, 0.02); tone(t, 'triangle', 840, 1960, 0.2, 0.05, d, 0.02); },
            missile(t, d) { noise(t, 0.5, 'bandpass', 900, 2600, 1.2, 0.3, d, 0.05); },
            explosion(t, d) { noise(t, 1.4, 'lowpass', 2600, 120, 0.7, 1.0, d); tone(t, 'sine', 85, 24, 1.0, 1.0, d); noise(t, 0.12, 'highpass', 2000, 1000, 0.5, 0.5, d); },
            smallboom(t, d) { noise(t, 0.6, 'lowpass', 2200, 160, 0.7, 0.7, d); tone(t, 'sine', 110, 35, 0.4, 0.6, d); },
            hit(t, d) { tone(t, 'sine', 230, 90, 0.07, 0.3, d); noise(t, 0.05, 'lowpass', 1000, 400, 1, 0.25, d); },
            hurt(t, d) { tone(t, 'sawtooth', 160, 70, 0.18, 0.2, d); noise(t, 0.15, 'lowpass', 1400, 300, 1, 0.4, d); },
            hitmarker(t, d) { tone(t, 'sine', 2700, 2500, 0.035, 0.11, d); },
            kill(t, d) { tone(t, 'sine', 1700, 2700, 0.07, 0.12, d); tone(t + 0.03, 'sine', 900, 900, 0.08, 0.08, d); },
            shield(t, d) { tone(t, 'triangle', 1350, 1250, 0.28, 0.12, d); tone(t, 'triangle', 2150, 2000, 0.2, 0.07, d); },
            ricochet(t, d) { tone(t, 'sine', 3400, 1100, 0.16, 0.06, d); },
            reload(t, d) { noise(t, 0.04, 'bandpass', 2600, 2600, 3, 0.25, d); noise(t + 0.18, 0.05, 'bandpass', 1700, 1700, 3, 0.3, d); },
            reloadEnd(t, d) { noise(t, 0.05, 'bandpass', 3200, 3200, 4, 0.35, d); tone(t, 'square', 600, 400, 0.03, 0.05, d); },
            empty(t, d) { tone(t, 'square', 1900, 1900, 0.025, 0.07, d); },
            dash(t, d) { noise(t, 0.24, 'bandpass', 500, 2200, 1.3, 0.3, d, 0.03); },
            pickup(t, d) { tone(t, 'sine', 880, 880, 0.07, 0.12, d); tone(t + 0.06, 'sine', 1320, 1320, 0.1, 0.12, d); },
            buy(t, d) { tone(t, 'sine', 660, 660, 0.06, 0.12, d); tone(t + 0.05, 'sine', 990, 990, 0.08, 0.12, d); tone(t + 0.1, 'sine', 1320, 1320, 0.12, 0.1, d); },
            deny(t, d) { tone(t, 'square', 170, 150, 0.14, 0.08, d); },
            ui(t, d) { tone(t, 'sine', 1250, 1250, 0.03, 0.06, d); },
            hover(t, d) { tone(t, 'sine', 1900, 1900, 0.018, 0.025, d); },
            bounce(t, d) { noise(t, 0.05, 'bandpass', 1400, 900, 2, 0.25, d); },
            beep(t, d) { tone(t, 'square', 1750, 1750, 0.05, 0.08, d); },
            plant(t, d) { for (let i = 0; i < 3; i++)
                tone(t + i * 0.09, 'square', 1500, 1500, 0.04, 0.07, d); },
            defuse(t, d) { tone(t, 'sine', 500, 1500, 0.3, 0.12, d); tone(t + 0.3, 'sine', 1500, 1500, 0.15, 0.1, d); },
            snap(t, d) { noise(t, 0.06, 'highpass', 2500, 1500, 0.8, 0.7, d); tone(t, 'sine', 320, 80, 0.05, 0.4, d); },
            scrape(t, d) { noise(t, 0.3, 'bandpass', 320, 260, 3, 0.4, d, 0.02); },
            growl(t, d) { tone(t, 'sawtooth', 52, 46, 1.3, 0.16, d, 0.2); tone(t, 'sawtooth', 55.5, 49, 1.3, 0.16, d, 0.2); noise(t, 1.2, 'lowpass', 300, 200, 1, 0.2, d, 0.3); },
            heartbeat(t, d) { tone(t, 'sine', 62, 38, 0.13, 0.4, d); tone(t + 0.2, 'sine', 55, 34, 0.12, 0.3, d); },
            radio(t, d) { noise(t, 0.13, 'bandpass', 1800, 1800, 2, 0.1, d); tone(t + 0.1, 'sine', 1450, 1450, 0.05, 0.06, d); },
            alert(t, d) { tone(t, 'square', 880, 880, 0.12, 0.07, d); tone(t + 0.14, 'square', 660, 660, 0.18, 0.07, d); },
            horn(t, d) { tone(t, 'sawtooth', 220, 220, 0.6, 0.12, d, 0.05); tone(t, 'sawtooth', 223, 223, 0.6, 0.12, d, 0.05); tone(t + 0.7, 'sawtooth', 185, 185, 0.8, 0.12, d, 0.05); },
            blink(t, d) { tone(t, 'sine', 2000, 180, 0.26, 0.12, d); noise(t, 0.2, 'highpass', 4000, 1500, 0.7, 0.12, d); },
            servo(t, d) { noise(t, 0.22, 'lowpass', 340, 120, 1, 0.55, d); tone(t, 'sine', 55, 32, 0.25, 0.5, d); },
            spin(t, d) { tone(t, 'sawtooth', 80, 420, 0.8, 0.06, d, 0.1); },
            ball(t, d, o) { const f = 700 + (o.p || 0) * 900; tone(t, 'sine', f, f * 0.8, 0.06, 0.18, d); },
            zombie(t, d) { tone(t, 'sawtooth', 95, 70, 0.5, 0.08, d, 0.08); noise(t, 0.4, 'bandpass', 500, 300, 2, 0.08, d, 0.08); },
            ding(t, d) { tone(t, 'sine', 1046, 1046, 1.2, 0.12, d); tone(t, 'sine', 1318, 1318, 1.0, 0.07, d); tone(t + 0.35, 'sine', 784, 784, 1.2, 0.1, d); },
            clang(t, d) { tone(t, 'triangle', 130, 110, 0.7, 0.4, d); noise(t, 0.4, 'bandpass', 900, 500, 1.5, 0.5, d); tone(t, 'sine', 420, 400, 0.6, 0.12, d); },
            pill(t, d) { tone(t, 'sine', 520, 1040, 0.25, 0.12, d, 0.02); tone(t + 0.12, 'sine', 780, 1560, 0.3, 0.1, d, 0.02); },
            can(t, d) { noise(t, 0.12, 'highpass', 5000, 3000, 0.7, 0.3, d); noise(t + 0.1, 0.35, 'bandpass', 3500, 6000, 2, 0.1, d, 0.05); },
            throw(t, d) { noise(t, 0.15, 'bandpass', 900, 1800, 1, 0.15, d, 0.02); },
            deploy(t, d) { tone(t, 'square', 300, 600, 0.12, 0.06, d); tone(t + 0.15, 'square', 600, 900, 0.12, 0.06, d); noise(t, 0.1, 'bandpass', 2000, 2000, 2, 0.2, d); },
            wardon(t, d) { tone(t, 'sine', 300, 600, 0.5, 0.1, d, 0.1); tone(t, 'sine', 450, 900, 0.5, 0.06, d, 0.1); },
            rise(t, d) { tone(t, 'sawtooth', 60, 240, 1.4, 0.1, d, 0.4); noise(t, 1.4, 'bandpass', 200, 1600, 1, 0.12, d, 0.4); },
            gameover(t, d) { tone(t, 'sawtooth', 110, 55, 2.2, 0.14, d, 0.1); tone(t, 'sawtooth', 112, 56, 2.2, 0.14, d, 0.1); },
            victory(t, d) { [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, 'triangle', f, f, 0.6, 0.1, d)); },
        };
        const MIN_GAP = { enemy: 0.03, hit: 0.03, hitmarker: 0.035, minigun: 0.045, ricochet: 0.06, bounce: 0.05, shield: 0.05, scrape: 0.18, zombie: 0.6, hover: 0.04 };
        /* opts: {x, y} positional, {ui:true}, {vol}, {p} */
        function play(name, opts = {}) {
            const fn = SOUNDS[name];
            if (!fn || !ctx || document.hidden)
                return;
            if (ctx.state !== 'running') {
                const at = performance.now();
                if (at - resumeAt <= STARTUP_WINDOW && pendingSounds.length < 12) {
                    pendingSounds.push({ name, opts: { ...opts }, at });
                }
                return;
            }
            const now = ctx.currentTime;
            const gap = MIN_GAP[name] || 0.012;
            const previous = last[name];
            if (previous !== undefined && now - previous < gap)
                return;
            let vol = opts.vol == null ? 1 : opts.vol, pan = 0;
            if (opts.x != null && opts.y != null) {
                const dx = opts.x - listener.x, dy = opts.y - listener.y;
                const dd = Math.hypot(dx, dy);
                if (dd > 1700)
                    return;
                vol *= 1 / (1 + dd / 380);
                pan = G.clamp(dx / 700, -0.85, 0.85);
            }
            last[name] = now;
            const dest = out(ctx, opts.ui ? ui : sfx, pan, vol, !opts.ui);
            fn(now + 0.005, dest, opts);
        }
        /* Alarm siren */
        let siren = null;
        let sirenWanted = false;
        function setSiren(on) {
            sirenWanted = on;
            if (!ctx)
                return;
            if (on && !siren) {
                const o = ctx.createOscillator();
                o.type = 'triangle';
                o.frequency.value = 700;
                const lfo = ctx.createOscillator();
                lfo.frequency.value = 0.55;
                const lg = ctx.createGain();
                lg.gain.value = 180;
                lfo.connect(lg);
                lg.connect(o.frequency);
                const f = ctx.createBiquadFilter();
                f.type = 'bandpass';
                f.frequency.value = 900;
                f.Q.value = 0.8;
                const g = ctx.createGain();
                g.gain.value = 0.0001;
                g.gain.setTargetAtTime(0.045, ctx.currentTime, 0.4);
                o.connect(f);
                f.connect(g);
                g.connect(sfx);
                g.connect(verbSend);
                o.start();
                lfo.start();
                siren = { o, lfo, g };
            }
            else if (!on && siren) {
                const s = siren;
                siren = null;
                s.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
                setTimeout(() => { try {
                    s.o.stop();
                    s.lfo.stop();
                }
                catch (e) { /* stopped */ } }, 1500);
            }
        }
        /* Generative score: 100 bpm sixteenth grid, intensity layers 0 to 3 */
        const M = { level: 0, step: 0, next: 0, bar: -1, pad: [] };
        const STEP = 60 / 100 / 4;
        const PROG = [0, 0, -4, -5]; // Am Am F E
        const CHORD = [[0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]];
        const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
        let padFilter, mDelay, musicTimer;
        function startMusic(ctx) {
            M.pad = [];
            M.bar = -1;
            padFilter = ctx.createBiquadFilter();
            padFilter.type = 'lowpass';
            padFilter.frequency.value = 420;
            padFilter.Q.value = 0.6;
            const padGain = ctx.createGain();
            padGain.gain.value = 0.0001;
            padFilter.connect(padGain);
            padGain.connect(music);
            for (let i = 0; i < 6; i++) {
                const o = ctx.createOscillator();
                o.type = 'sawtooth';
                o.detune.value = (i % 2 ? 1 : -1) * 9;
                o.frequency.value = mf(45);
                const g = ctx.createGain();
                g.gain.value = 0.05;
                o.connect(g);
                g.connect(padFilter);
                o.start();
                M.pad.push(o);
            }
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.07;
            const lg = ctx.createGain();
            lg.gain.value = 160;
            lfo.connect(lg);
            lg.connect(padFilter.frequency);
            lfo.start();
            padGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2);
            mDelay = ctx.createDelay(1);
            mDelay.delayTime.value = 0.45;
            const fb = ctx.createGain();
            fb.gain.value = 0.35;
            const dl = ctx.createBiquadFilter();
            dl.type = 'lowpass';
            dl.frequency.value = 2400;
            mDelay.connect(dl);
            dl.connect(fb);
            fb.connect(mDelay);
            dl.connect(music);
            M.next = ctx.currentTime + 0.1;
            if (musicTimer === undefined)
                musicTimer = window.setInterval(schedule, 25);
        }
        function setMusic(level) { M.level = level; }
        function schedule() {
            if (!ctx || document.hidden || ctx.state !== 'running')
                return;
            const now = ctx.currentTime;
            if (M.next < now) {
                const missed = Math.ceil((now - M.next) / STEP);
                M.step += missed;
                M.next += missed * STEP;
            }
            while (M.next < now + 0.14) {
                playStep(ctx, M.step, M.next);
                M.next += STEP;
                M.step++;
            }
        }
        function playStep(ctx, step, t) {
            const lv = M.level;
            const bar = Math.floor(step / 16);
            const s = step % 16;
            const root = 45 + PROG[bar % PROG.length];
            const ch = CHORD[bar % CHORD.length];
            if (bar !== M.bar) {
                M.bar = bar;
                M.pad.forEach((o, i) => {
                    const n = root + ch[i % 3] + (i >= 3 ? 12 : 0) - 12;
                    o.frequency.setTargetAtTime(mf(n), t, 0.3);
                });
                padFilter.frequency.setTargetAtTime(lv >= 3 ? 900 : lv >= 2 ? 650 : 420, t, 1);
            }
            if (lv === 0) {
                if (s % 8 === 0 && Math.random() < 0.55) {
                    const sc = [0, 3, 5, 7, 10, 12, 15];
                    const n = root + 24 + G.pick(sc);
                    tone(t, 'sine', mf(n), mf(n), 1.6, 0.05, mDelay, 0.01);
                    tone(t, 'sine', mf(n), mf(n), 1.6, 0.06, music, 0.01);
                }
                return;
            }
            // bass
            if (s % 2 === 0) {
                const n = root - 12 + (s % 8 === 6 ? 12 : 0);
                const f = ctx.createBiquadFilter();
                f.type = 'lowpass';
                f.Q.value = 6;
                f.frequency.setValueAtTime(lv >= 3 ? 1600 : 900, t);
                f.frequency.exponentialRampToValueAtTime(140, t + 0.14);
                f.connect(music);
                tone(t, 'sawtooth', mf(n), mf(n), 0.16, 0.16, f);
            }
            // hats
            if ((lv >= 2 && s % 2 === 1) || (lv === 1 && s % 4 === 2))
                noise(t, 0.04, 'highpass', 7000, 7000, 0.5, s % 4 === 2 ? 0.07 : 0.035, music);
            if (lv >= 3 && s % 2 === 0)
                noise(t, 0.025, 'highpass', 9000, 9000, 0.5, 0.025, music);
            if (lv >= 2) {
                if (s % 4 === 0 || (lv >= 3 && s === 14))
                    tone(t, 'sine', 140, 40, 0.18, 0.5, music);
                if (s === 4 || s === 12) {
                    noise(t, 0.16, 'bandpass', 1800, 900, 0.8, 0.14, music);
                    tone(t, 'triangle', 220, 140, 0.08, 0.08, music);
                }
                if (s % 2 === 0) {
                    const arp = [0, 7, 12, 15, 12, 7, 3, 7];
                    const n = root + 12 + arp[(s / 2) % 8] + (ch[1] === 4 && arp[(s / 2) % 8] === 3 ? 1 : 0);
                    tone(t, 'square', mf(n), mf(n), 0.12, 0.022, mDelay);
                    tone(t, 'square', mf(n), mf(n), 0.1, 0.025, music);
                }
            }
        }
        return { listener, init, setVolumes, play, siren: setSiren, setMusic };
    })();
})(G || (G = {}));
