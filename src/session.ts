export type Screen = 'menu' | 'brief' | 'play' | 'pause' | 'manual' | 'settings' | 'credits' | 'armory' | 'report';

export interface RuntimeSession { state: Screen }
