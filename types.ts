
export enum Player {
  None = 0,
  Black = 1,
  White = 2,
}

export enum GameMode {
  Local = 'LOCAL',
  Online = 'ONLINE',
  AI = 'AI',
}

export enum OnlineRole {
  Host = 'HOST',
  Guest = 'GUEST',
}

export enum ConnectionState {
  Disconnected = 'DISCONNECTED',
  Connecting = 'CONNECTING',
  Connected = 'CONNECTED',
  Error = 'ERROR',
}

export interface Move {
  x: number;
  y: number;
  player: Player;
}

export interface BoardState {
  grid: Player[][];
  lastMove: Move | null;
  winner: Player | null;
  winningLine: { x: number; y: number }[] | null;
  turn: Player;
}

export type PeerData = {
  type: 'MOVE' | 'RESTART' | 'DISCONNECT' | 'CHAT';
  payload?: any;
};

export interface ChatMessage {
  id: string;
  text: string;
  isSelf: boolean;
  timestamp: number;
}
