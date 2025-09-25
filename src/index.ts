import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 4000;

app.use("*", cors());
app.use("*", logger());

app.onError((err, c) => {
  return c.json({ message: "An internal server error occured" }, 500);
});

app.notFound((c) => {
  return c.json({ message: `Not found: ${c.req.method} ${c.req.url}` });
});

const api = app.basePath("/api/notes");

api.get("/", async (c) => {
  try {
    const notes = await prisma.note.findMany({
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
    const note = await prisma.note.findUnique({
      where: { id },
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
    if (!title?.trim() || !priority?.trim() || !description?.trim()) {
      return c.json({ message: "All fields are required" });
    }

    const newNote = await prisma.note.create({
      data: {
        title: title.trim(),
        priority: priority.trim(),
        description: description.trim(),
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
    if (!title?.trim() || !priority?.trim() || !description?.trim()) {
      return c.json({ message: "All fields are required" });
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
