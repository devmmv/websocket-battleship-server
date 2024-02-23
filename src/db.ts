import { Room, User } from "./types";

export const users: {
  [userName: string]: User;
} = {};

export const rooms: {
  [gameRoomId: number]: Room;
} = {};
