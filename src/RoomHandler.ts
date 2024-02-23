import { WebSocketServer } from "ws";
import { rooms } from "./db";
import { responseMsg } from "./responseMsg";

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
}
