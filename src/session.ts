export type Screen = 'menu' | 'brief' | 'play' | 'pause' | 'manual' | 'settings' | 'credits' | 'armory' | 'report';

export const session: { state: Screen } = { state: 'menu' };
