import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { PrismaClient } from "@prisma/client";
import { auth } from "./lib/auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 4001;

app.use(
  "*",
  cors({
    origin: "http://localhost:3000", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.use("*", logger());

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.onError((err, c) => {
  return c.json({ message: "An internal server error occured" }, 500);
});

app.notFound((c) => {
  return c.json({ message: `Not found: ${c.req.method} ${c.req.url}` });
});

const api = app.basePath("/api/notes");

api.get("/", async (c) => {
  try {
    const user = c.get("user");
    const notes = await prisma.note.findMany({
      where: {
        userId: user?.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const transformedNotes = notes.map((note) => ({
      ...note,
      _id: note.id,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));
    return c.json(transformedNotes);
  } catch (err) {
    return c.json({ message: "Could not fetch notes", err }, 500);
  }
});

api.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const note = await prisma.note.findFirst({
      where: { id, userId: user?.id },
    });
    if (!note) {
      return c.json({ message: "Note not found" }, 404);
    }
    const transformedNotes = {
      ...note,
      _id: note.id,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
    return c.json(transformedNotes);
  } catch (err) {
    return c.json({ message: "Could not fetch note", err }, 500);
  }
});

api.post("/new", async (c) => {
  try {
    let body;
    const contentType = c.req.header("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await c.req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      body = await c.req.parseBody();
    } else {
      return c.json({ message: "unsupported content type" });
    }
    const { title, priority, description } = body;
    const user = c.get("user");

    if (!title?.trim() || !priority?.trim() || !description?.trim()) {
      return c.json({ message: "All fields are required" });
    }
    if (!user?.id) {
      return c.json({ message: "User ID not found" }, 401);
    }

    const newNote = await prisma.note.create({
      data: {
        title: title.trim(),
        priority: priority.trim(),
        description: description.trim(),
        userId: user?.id,
      },
    });
    const transformedNotes = {
      ...newNote,
      _id: newNote.id,
      createdAt: newNote.createdAt.toISOString(),
      updatedAt: newNote.updatedAt.toISOString(),
    };
    return c.json(transformedNotes);
  } catch (err) {
    console.error("Error creating note:", err);
    return c.json({ message: "Error creating note", err }, 401);
  }
});

api.put("/:id", async (c) => {
  try {
    let body;
    const contentType = c.req.header("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await c.req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      body = await c.req.parseBody();
    } else {
      return c.json({ message: "unsupported content type" });
    }
    const id = c.req.param("id");
    const { title, priority, description } = body;
    const user = c.get("user");
    if (!title?.trim() || !priority?.trim() || !description?.trim()) {
      return c.json({ message: "All fields are required" });
    }
    const existingNote = await prisma.note.findFirst({
      where: { id, userId: user?.id },
    });

    if (!existingNote) {
      return c.json({ message: "Note not found" }, 404);
    }
    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        title: title.trim(),
        priority: priority.trim(),
        description: description.trim(),
      },
    });
    const transformedNotes = {
      ...updatedNote,
      _id: updatedNote.id,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
    };
    return c.json(transformedNotes);
  } catch (err) {
    console.error("Error creating note:", err);
    return c.json({ message: "Error updating note", err }, 401);
  }
});

api.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");

    const existingNote = await prisma.note.findFirst({
      where: { id, userId: user?.id },
    });

    if (!existingNote) {
      return c.json({ message: "Note not found" }, 404);
    }
    await prisma.note.delete({
      where: { id },
    });
    return c.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Error deleting note", err);
    return c.json({ message: "Error  deleting note", err }, 400);
  }
});

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Listening on http://localhost:${server.port} ...`);
