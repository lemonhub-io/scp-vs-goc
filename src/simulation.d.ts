import type { Point } from './core';
import type { AnomalyId, EnemyType } from './data';
import type { CollisionBody, MapCell } from './map';

export type TranslationVars = Record<string, string | number>;
export type Phase = 'combat' | 'armory' | 'finished';
export type Outcome = 'win' | 'kia' | 'lost';
export type Team = 'hostile' | 'player' | 'sentry';
export interface Arm { owned: boolean; mag: number; reserve: number; cd: number; reload: number }
export interface Player extends CollisionBody {
  angle: number; hp: number; armor: number; weapon: number; kick: number; bloom: number;
  arms: Arm[]; dash: number; dashTime: number; dashAngle: number; invulnerable: number; cola: number;
  step: number; flash: number; hit: number; vx?: number; vy?: number; hurtAngle?: number; warned?: boolean;
}
export interface Charge extends Point { fuse: number; max: number; progress: number; nextBeep: number }
export interface ContainmentCell extends MapCell { hp: number; charge: Charge | null }
export interface Locker extends Point { cd: number }
export interface Anomaly extends CollisionBody {
  kind: AnomalyId; cell: ContainmentCell; angle: number; health: number; dormant: number;
  cd: number; step: number; hop: number; watched?: boolean;
}
export interface Enemy extends CollisionBody {
  type: EnemyType; angle: number; hp: number; max: number; speed: number; cd: number; grace: number;
  boss: boolean; wards: number; ward: number; hit: number; step: number; swing: number;
  lock: number; lockAngle: number; planting: number; armed: number; stomp: number;
  dead?: boolean; elite?: boolean; from?: number; ai?: EnemyMind; kick?: number; flash?: number;
  target?: ContainmentCell | null; warded?: boolean; wardRetryAt?: number; special?: number;
  casts?: number; burst?: number; spin?: number; drones?: boolean; podReady?: boolean;
}
export interface Contact extends Point { at: number; vx?: number; vy?: number }
export type EnemyMode = 'search' | 'fight' | 'cover' | 'escort' | 'evade' | 'plant';
export interface EnemyMind {
  nextThink: number; flank: boolean; patrol: number; readyAt: number; searchStep: number;
  contact?: Contact | null; report?: Contact; visible?: boolean; lastSight?: number;
  searchContact?: Contact; searchGoal?: Point | null; goal?: Point | null; mode?: EnemyMode;
  flankAngle?: number; flankSide: number; pressureUntil?: number; coverUntil?: number;
  coverReadyAt?: number; chooseAgainAt?: number; wardAt?: number;
}
export interface Threat extends Point { r: number; device: ThrownDevice }
export interface Shot { hit: boolean }
export interface ProjectileOptions {
  life?: number; len?: number; color?: string; homing?: number; blast?: number; lob?: boolean;
  shot?: Shot; knock?: number; falloff?: number;
}
export interface Projectile extends Point, ProjectileOptions {
  angle: number; speed: number; damage: number; team: Team; life: number; len: number; color: string; traveled: number;
}
export interface ThrownDevice extends CollisionBody {
  type: 'frag' | 'scp018'; vx: number; vy: number; life: number; duration: number;
  bounce: number; contacts: Map<Enemy | Anomaly, number>; age: number;
}
export interface Turret extends Point { type: 'sentry'; angle: number; life: number; duration: number; cd: number }
export type Device = ThrownDevice | Turret;
export interface Drop extends Point { kind: 'ammo' | 'plate' | 'med'; life: number }
export interface EffectPayloads {
  spark: { color: string; vx: number; vy: number };
  afterimage: { angle: number };
  arc: { tx: number; ty: number; color: string };
  beam: { tx: number; ty: number; color: string };
  ring: { radius: number; color: string; bright?: boolean };
  text: { color: string; text: string | number; vx: number; vy: number };
  number: { color: string; text: string | number; vx: number; vy: number; big?: boolean };
}
export type EffectKind = keyof EffectPayloads;
export type EffectSpec = { [K in EffectKind]: { type: K; duration?: number } & EffectPayloads[K] }[EffectKind];
export type Effect = EffectSpec & Point & { life: number; duration: number };
export interface GroundMark extends CollisionBody { life: number; max: number }
export interface RadioLine { from: string; key: string; vars: TranslationVars; at: number }
export interface Note { key: string; vars: TranslationVars; tone: string; until: number }
export interface Banner { title: string; subtitle: string; vars: TranslationVars; until: number; end?: boolean }
export interface Interaction { key: string; progress: number }
