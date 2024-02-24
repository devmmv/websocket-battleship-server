import { WebSocketServer } from "ws";
import { rooms } from "./db";
import { responseMsg } from "./responseMsg";
import { IWebSocket, Player, Room, Ship } from "./types";

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

  attack(data: string) {
    const { gameId, indexPlayer, x, y } = JSON.parse(data);
    const enemyId = indexPlayer === 1 ? 0 : 1;

    const room = rooms[gameId];
    const players = room?.players;
    const enemy = players?.[enemyId];
    const player = players?.[indexPlayer];

    if (!room || room.playerId !== indexPlayer || !enemy || !enemy) return;

    const result = this.getResult(enemy, x, y);

    if (!result) return;

    const { status, shipIndex } = result;

    let isWin = false;

    if (status === "killed") {
      this.markKilledShipAround(room, enemy, shipIndex);
      isWin = !!enemy.ships?.every((ship) => ship.health === 0);
    }

    players.forEach(
      ({ client }) =>
        client &&
        client.send(
          responseMsg("attack", {
            position: { x, y },
            currentPlayer: indexPlayer,
            status,
          })
        )
    );

    if (isWin) {
      this.finishGame(players, indexPlayer);

      delete rooms?.[gameId];

      return enemy.isBot || player.isBot ? undefined : player.client?.userName;
    }

    this.turn(gameId, status === "miss" ? enemyId : undefined);
  }

  randomAttack(dataString: string) {
    const { gameId, indexPlayer } = JSON.parse(dataString);

    const enemyId = indexPlayer === 1 ? 0 : 1;
    const enemy = rooms[gameId]?.players?.[enemyId];

    if (!enemy) return;

    while (true) {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);

      const cell = enemy.board?.[x]?.[y];

      if (!cell || cell.isAttacked) continue;

      this.attack(JSON.stringify({ gameId, indexPlayer, x, y }));
      break;
    }
  }

  finishGame(players: Player[], winnerIndex: number) {
    players.forEach(({ client }) => {
      client &&
        client.send(
          responseMsg("finish", {
            winPlayer: winnerIndex,
          })
        );
    });
  }

  private markKilledShipAround(room: Room, enemy: Player, shipIndex: number) {
    const ship = enemy.ships?.[shipIndex];

    if (!ship) return;

    for (let i = -1; i < ship.length + 1; i++) {
      for (let j = -1; j < 2; j++) {
        const x = ship.position.x + (ship.direction ? j : i);
        const y = ship.position.y + (ship.direction ? i : j);

        const cell = enemy.board?.[x]?.[y];

        if (!cell || cell.isAttacked) continue;

        cell.isAttacked = true;

        room.players.forEach(
          ({ client }) =>
            client &&
            client.send(
              responseMsg("attack", {
                position: { x, y },
                currentPlayer: room.playerId,
                status: "miss",
              })
            )
        );

        this.turn(room.roomId);
      }
    }
  }
  private getResult(enemy: Player, x: number, y: number) {
    const cell = enemy.board?.[x]?.[y];

    if (!cell || cell.isAttacked) return;

    cell.isAttacked = true;

    const { shipIndex } = cell;

    if (shipIndex === -1) {
      return { status: "miss", shipIndex };
    }

    const ship = enemy.ships?.[shipIndex];

    if (!ship || !ship.health) return;

    ship.health -= 1;

    return { status: ship.health === 0 ? "killed" : "shot", shipIndex };
  }
}
