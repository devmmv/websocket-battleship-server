import { WebSocketServer } from "ws";
import { users } from "./db";
import { responseMsg } from "./responseMsg";
import { IWebSocket, MsgType } from "./types";

export class UsersHandler {
  counter = 1;

  reg({ data, type }: MsgType, client: IWebSocket) {
    const userData = JSON.parse(data);
    const { name, password } = userData;
    const user = users[name];

    if (!user) {
      const index = this.counter++;
      users[name] = { ...userData, client, wins: 0, index };

      client.userName = name;

      client.send(
        responseMsg(type, {
          name,
          index,
          error: false,
          errorText: "",
        })
      );
      console.log("<--  reg");
    } else {
      if (user.client.connected) {
        console.log("User is already exists");

        return client.send(
          responseMsg(type, {
            name,
            index: -1,
            error: true,
            errorText: "User is already exists",
          })
        );
      }

      if (user.password !== password) {
        console.log("Password is incorrect");

        return client.send(
          responseMsg(type, {
            name,
            index: -1,
            error: true,
            errorText: "Password is incorrect",
          })
        );
      }

      client.userName = name;
      user.client = client;

      client.send(
        responseMsg(type, {
          name,
          index: user.index,
          error: false,
          errorText: "",
        })
      );
      console.log("<--  reg");
    }
  }
  updateWinners(wss: WebSocketServer) {
    const winners = Object.entries(users)
      .filter(([, user]) => user.wins > 0)
      .map(([name, user]) => ({
        name,
        wins: user.wins,
      }));

    wss.clients.forEach((client) =>
      client.send(responseMsg("update_winners", winners))
    );
    console.log("<--  update_winners");
  }

  addWinner(userName: string) {
    const user = users[userName];

    if (user) user.wins += 1;
  }
}
