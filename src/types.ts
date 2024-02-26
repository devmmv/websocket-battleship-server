import { WebSocket } from "ws";

export interface IWebSocket extends WebSocket {
  userName: string;
  connected: boolean;
}
export type MsgType = {
  type: string;
  data: string;
  id: 0;
};

export type Room = {
  roomId: number;
  admin: string;
  playerId: number;
  players: Player[];
};

export type User = {
  index: number;
  name: string;
  password: string;
  client: IWebSocket;
  wins: number;
};

export type Player = {
  isBot: boolean;
  index: number;
  client?: IWebSocket;
  ships?: Ship[];
  board?: { shipIndex: number; isAttacked: boolean }[][];
};

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
  health?: number;
};
