import { WebSocketServer } from "ws";
import { rooms } from "./db";
import { responseMsg } from "./responseMsg";
import { IWebSocket, Room } from "./types";

export class RoomHandler {
  counter = 1;

  updateRoom(wss: WebSocketServer) {
    const freeRooms = Object.entries(rooms)
      .filter(([, room]) => room.players.length === 1)
      .map(([id, room]) => {
        const firstPlayer = room.players[0];

        return {
          roomId: id,
          roomUsers: [
            {
              name: firstPlayer?.client?.userName,
              index: firstPlayer?.index,
            },
          ],
        };
      });

    wss.clients.forEach((client) => {
      return client.send(responseMsg("update_room", freeRooms));
    });
  }
  createRoom(client: IWebSocket) {
    const room = Object.entries(rooms).find(
      ([, room]) => room.admin === client.userName
    );

    if (room) return;

    const roomId = this.counter++;

    rooms[roomId] = {
      roomId,
      admin: client.userName,
      playerId: -1,
      players: [{ client, index: 0, isBot: false }],
    };

    return { roomId, room: rooms[roomId] as Room };
  }

  addUserToRoom(data: string, client: IWebSocket) {
    const roomId = JSON.parse(data).indexRoom;
    const room = rooms[roomId];
    const players = room?.players;
    const firstPlayer = players?.[0];

    if (
      !room ||
      !firstPlayer ||
      players.length !== 1 ||
      room?.admin === client.userName
    )
      return;

    rooms[roomId] = {
      ...room,
      players: [firstPlayer, { client, index: 1, isBot: false }],
    };

    return roomId;
  }
  createGame(roomId: number) {
    rooms[roomId]?.players?.forEach(
      ({ client, index }) =>
        client &&
        client.send(
          responseMsg("create_game", {
            idGame: roomId,
            idPlayer: index,
          })
        )
    );
  }
}
