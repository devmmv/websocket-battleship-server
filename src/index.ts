import { httpServer } from "./http_server/index";
import { WebSocketServer } from "ws";
import { IWebSocket, MsgType } from "./types";
import { WebSocketHandler } from "./WsHandler";

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const wsServer = new WebSocketServer({ port: 3000 }, () => {
  console.log("WebSocket Ready!");
});
const wsHandler = new WebSocketHandler(wsServer);

wsServer.on("connection", (client: IWebSocket) => {
  client.connected = true;

  client.on("message", (msg) => {
    const message: MsgType = JSON.parse(msg.toString());

    switch (message.type) {
      case "reg": {
        wsHandler.reg(client, message);
        break;
      }
      case "create_room": {
        wsHandler.createRoom(client);
        break;
      }
      case "add_user_to_room": {
        wsHandler.addUserToRoom(client, message);
        break;
      }
      case "add_ships": {
        wsHandler.addShips(message);
        break;
      }
      case "attack": {
        wsHandler.attack(message);
        break;
      }
      case "randomAttack": {
        wsHandler.randomAttack(message);
        break;
      }
    }
  });
});
