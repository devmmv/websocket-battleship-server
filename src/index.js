"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./http_server/index");
const HTTP_PORT = 8181;
console.log(`Start static http server on the ${HTTP_PORT} port!`);
index_1.httpServer.listen(HTTP_PORT);
