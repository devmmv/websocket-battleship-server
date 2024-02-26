import { httpServer } from "./http_server/index";
import { WebSocket, WebSocketServer } from "ws";
import { IWebSocket, MsgType } from "./types";
import { WebSocketHandler } from "./WsHandler";

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const wsServer = new WebSocketServer({ port: 3000 }, () => {
  console.log(`Start WebSocket server on the ${wsServer.options.port} port!`);
});
const wsHandler = new WebSocketHandler(wsServer);

wsServer.on("connection", (client: IWebSocket) => {
  client.connected = true;

  client.on("message", (msg) => {
    const message: MsgType = JSON.parse(msg.toString());

    switch (message.type) {
      case "reg": {
        console.log("-->  reg");
        wsHandler.reg(client, message);
        break;
      }
      case "create_room": {
        console.log("-->  create_room");
        wsHandler.createRoom(client);
        break;
      }
      case "add_user_to_room": {
        console.log("-->  add_user_room");
        wsHandler.addUserToRoom(client, message);
        break;
      }
      case "add_ships": {
        console.log("-->  add_ships");
        wsHandler.addShips(message);
        break;
      }
      case "attack": {
        wsHandler.attack(message);
        break;
      }
      case "randomAttack": {
        console.log("-->  randomAttack");
        wsHandler.randomAttack(message);
        break;
      }
      case "single_play": {
        console.log("-->  single_play");
        wsHandler.singlePlay(client);
        break;
      }
    }
  });

  client.on("error", console.error);

  client.on("pong", () => {
    client.connected = true;
  });

  client.on("close", () => {
    wsHandler.cleanUp(client);
  });

  process.on("SIGINT", () => {
    clearInterval(interval);

    wsServer.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    wsServer.close();
    httpServer.close();
    process.exit();
  });
});

const interval = setInterval(function ping() {
  wsServer.clients.forEach(function each(ws: WebSocket) {
    const client = ws as IWebSocket;

    if (client.connected === false) {
      return client.terminate();
    }

    client.connected = false;
    client.ping();
  });
}, 20000);
