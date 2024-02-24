import { WebSocketServer } from "ws";
import { rooms } from "./db";
import { responseMsg } from "./responseMsg";
import { IWebSocket, Room, Ship } from "./types";

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

  addShips(data: string) {
    const { gameId, indexPlayer, ships } = JSON.parse(data);

    const room = rooms[gameId];
    const players = room?.players;
    const player = players?.[indexPlayer];

    if (!room || !player) return;

    player.ships = ships;
    player.board = this.buildBoard(player.ships);

    if (players.every((player) => !!player.ships)) {
      players.forEach(
        ({ client, ships }) =>
          client &&
          client.send(
            responseMsg("start_game", {
              currentPlayerIndex: player.index,
              ships,
            })
          )
      );

      this.turn(gameId, player.index === 1 ? 0 : 1);
    }
  }

  private turn(gameId: number, nextPlayerId?: number) {
    const room = rooms[gameId];

    if (!room || !room.players) return;

    if (nextPlayerId !== undefined) {
      room.playerId = nextPlayerId;
    }

    room.players.forEach(({ client, isBot, index }) => {
      client &&
        client.send(
          responseMsg("turn", {
            currentPlayer: room.playerId,
          })
        );
    });
  }
  private buildBoard(ships: Ship[] | undefined) {
    if (!ships) return;

    const board = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({
        ...{ shipIndex: -1, isAttacked: false },
      }))
    );

    ships.forEach((ship, index) => {
      ship.health = ship.length;

      const { x, y } = ship.position;

      for (let i = 0; i < ship.length; i++) {
        const cell = ship.direction ? board[x]?.[y + i] : board[x + i]?.[y];

        if (cell && cell.shipIndex === -1) {
          cell.shipIndex = index;
        }
      }
    });

    return board;
  }
}
