import express, { Request, Response } from "express";
import { SigninSchema, SignupSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware";
import cors from "cors";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const port = 3001;
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET as string;

// Define a route handler for the default home page
app.get("/", (req: Request, res: Response) => {
  res.send("Server is up.");
});

app.post("/signup", async (req: Request, res: Response) => {
  try {
    const parsedData = SignupSchema.safeParse(req.body);

    if (!parsedData.success) {
      console.log(parsedData.error);
      res.json({
        message: "Incorrect inputs",
      });
      return;
    }

    const existingUser = await prismaClient.user.findUnique({
      where: {
        username: parsedData.data.username,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username already taken",
      });
    }

    const hashedPassword = await bcrypt.hash(
      parsedData.data.password,
      saltRounds
    );

    const user = await prismaClient.user.create({
      data: {
        username: parsedData.data.username,
        password: hashedPassword,
        summary: "",
      },
    });

    await prismaClient.chat.create({
      data: {
        userId: user.id,
        message:
          "A chill wind howls through the desolate spires of Eldoria, a city now nothing more than a rain-slicked tomb. Above, the sky weeps a perpetual drizzle, mirroring the despair of its few remaining souls.Suddenly, a figure emerges from the gloom: Elara, the Whisperwind, her crimson cloak a lone splash of color against the gray. She stands before the city's gates, her hand on her dagger, her emerald eyes scanning for any sign of hope.From the city's depths, a guttural roar tears through the air. Lord Kaelen, the Shadowbinder, stalks forward, his obsidian armor a void of malevolent power. In his grasp, a helpless citizen struggles, a cruel trophy in Kaelen's dark parade.Elara tenses, her jaw set. This is a scene she knows well, but tonight is different. A new presence shimmers on the edge of her sight, a glimmer of light that defies the eternal gloom. The prophesied hero has arrived.",
      },
    });

    res.json({
      userId: user.id,
    });
  } catch (e) {
    res.status(411).json({
      message: "User already exists with this username",
    });
  }
});

app.post("/signin", async (req: Request, res: Response) => {
  try {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
      console.log(parsedData.error);
      res.status(400).json({
        message: "Incorrect inputs",
      });
      return;
    }

    const user = await prismaClient.user.findUnique({
      where: {
        username: parsedData.data.username,
      },
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid credentials",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(
      parsedData.data.password,
      user.password
    );

    if (!isValidPassword) {
      res.status(401).json({
        message: "Invalid credentials",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      JWT_SECRET
    );

    res.json({
      message: "Sign in successful",
      token: token,
    });
  } catch (e) {
    console.error("Signin error:", e);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.get("/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        messages: [],
      });
    }

    const mode = req.query.mode;

    let messages;

    if (mode == "all") {
      messages = await prismaClient.chat.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          message: true,
          userId: true,
        },
      });
    } else {
      messages = await prismaClient.chat.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          id: "desc",
        },
        take: 1,
        select: {
          message: true,
        },
      });
    }

    res.json({
      message: "Succesfully fetched all messages",
      messages: messages,
    });
  } catch (e) {
    console.error("Error fetching messages:", e);
    res.status(500).json({
      message: "Internal server error",
      messages: [],
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
