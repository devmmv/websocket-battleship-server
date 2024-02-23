import { httpServer } from "./http_server/index";
import { WebSocketServer } from "ws";
import { IWebSocket } from "./types";

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const wsServer = new WebSocketServer({ port: 3000 }, () => {
  console.log("WebSocket Ready!");
});

wsServer.on("connection", (client: IWebSocket) => {
  client.connected = true;
});
