interface Navigator {
  readonly standalone?: boolean;
  readonly audioSession?: { type: 'auto' | 'playback' | 'ambient' | 'transient' | 'transient-solo' | 'play-and-record' };
}

interface Window {
  readonly webkitAudioContext?: typeof AudioContext;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
