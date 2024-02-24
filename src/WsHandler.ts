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

  createRoom(client: IWebSocket) {
    if (this.roomHandler.createRoom(client)) this.responseToAll();
  }

  addUserToRoom(client: IWebSocket, message: MsgType) {
    const roomId = this.roomHandler.addUserToRoom(message.data, client);

    if (roomId) {
      this.responseToAll();
      this.roomHandler.createGame(roomId);
    }
  }

  addShips(message: MsgType) {
    this.roomHandler.addShips(message.data);
  }

  attack(message: MsgType) {
    const winner = this.roomHandler.attack(message.data);

    if (winner) {
      this.usersHandler.addWinner(winner);
      this.responseToAll();
    }
  }

  randomAttack(message: MsgType) {
    this.roomHandler.randomAttack(message.data);
  }

  singlePlay(client: IWebSocket) {
    this.roomHandler.singlePlay(client);
  }

  private responseToAll() {
    this.roomHandler.updateRoom(this.wss);
    this.usersHandler.updateWinners(this.wss);
  }
}
