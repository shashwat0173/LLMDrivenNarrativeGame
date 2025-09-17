import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { prismaClient } from "@repo/db/client";

const JWT_SECRET = process.env.JWT_SECRET as string;
const wss = new WebSocketServer({ port: 8080 }, () => {
  console.log("✅ WebSocket server running on ws://localhost:8080");
});

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded == "string") {
      return null;
    }

    if (!decoded || !decoded.userId) {
      return null;
    }

    return decoded.userId;
  } catch (e) {
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  ws.send("{connection succesfully estabalished");
  const url = request.url;
  if (!url) {
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return null;
  }

  ws.on("message", async function message(data) {
    let parsedData;
    if (typeof data !== "string") {
      parsedData = JSON.parse(data.toString());
    } else {
      parsedData = JSON.parse(data);
    }
    console.log("RECIEVED ON WS:", parsedData);

    await prismaClient.chat.create({
      data: {
        //@ts-ignore
        message: parsedData.player_action,
        //@ts-ignore
        userId: parseInt(userId),
      },
    });

    const summary_query_response = await prismaClient.user.findUnique({
      where: {
        id: parseInt(userId),
      },
      select: {
        summary: true,
      },
    });

    let summary = summary_query_response?.summary;

    let response = await fetch("http://localhost:8000/generatenext", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        history: summary,
        previous_ai_response: parsedData.previous_ai_response,
        player_action: parsedData.player_action, // Use the user's message as player action
      }),
    });

    response = await response.json();

    console.log("RESRESRES", response);

    await prismaClient.user.update({
      where: {
        id: parseInt(userId), // Use the appropriate unique identifier for your user
      },
      data: {
        // @ts-ignore
        summary: response.latest_history, // Save the latest_history to the summary field
      },
    });

    await prismaClient.chat.create({
      data: {
        //@ts-ignore
        message: response.latest_ai_response,
        //@ts-ignore
        userId: parseInt(userId),
      },
    });

    const responseData = {
      type: "ai_response",
      // @ts-ignore
      latest_ai_response: response.latest_ai_response,
    };
    ws.send(JSON.stringify(responseData));
  });
});
