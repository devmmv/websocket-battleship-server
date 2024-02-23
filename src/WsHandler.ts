import { WebSocketServer } from "ws";
import { UsersHandler } from "./UsersHandler";
import { IWebSocket, MsgType } from "./types";
import { RoomHandler } from "./RoomHandler";

export class WebSocketHandler {
  usersHandler = new UsersHandler();
  roomHandler = new RoomHandler();

  constructor(public wss: WebSocketServer) {}

  reg(client: IWebSocket, message: MsgType) {
    this.usersHandler.reg(message, client);
    this.responseToAll();
  }
  private responseToAll() {
    this.roomHandler.updateRoom(this.wss);
    this.usersHandler.updateWinners(this.wss);
  }
}
