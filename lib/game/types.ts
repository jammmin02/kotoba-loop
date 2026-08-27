export interface GameProfileState {
  level: number;
  exp: number;
}

export interface ExpGainResult extends GameProfileState {
  leveledUp: boolean;
}
