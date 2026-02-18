const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const localtunnel = require("localtunnel");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "workspaces.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Data persistence helpers ---

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadWorkspaces() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveWorkspaces(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getOrCreateWorkspace(name) {
  const workspaces = loadWorkspaces();
  if (!workspaces[name]) {
    workspaces[name] = {
      name,
      todos: [],
      notes: [],
      createdAt: new Date().toISOString(),
    };
    saveWorkspaces(workspaces);
  }
  return workspaces[name];
}

// --- API Routes ---

// Get or create a workspace by name
app.get("/api/workspaces/:name", (req, res) => {
  const workspace = getOrCreateWorkspace(req.params.name);
  res.json(workspace);
});

// --- To-Do routes ---

// Add a to-do
app.post("/api/workspaces/:name/todos", (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Todo text is required" });
  }
  const workspaces = loadWorkspaces();
  const workspace = getOrCreateWorkspace(req.params.name);
  workspace.todos.push({
    id: uuidv4(),
    text: text.trim(),
    done: false,
    createdBy: req.body.author || "Anonymous",
    createdAt: new Date().toISOString(),
  });
  workspaces[req.params.name] = workspace;
  saveWorkspaces(workspaces);
  res.status(201).json(workspace);
});

// Toggle a to-do's done status
app.patch("/api/workspaces/:name/todos/:id", (req, res) => {
  const workspaces = loadWorkspaces();
  const workspace = workspaces[req.params.name];
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const todo = workspace.todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });

  if (req.body.done !== undefined) todo.done = req.body.done;
  if (req.body.text !== undefined) todo.text = req.body.text;

  saveWorkspaces(workspaces);
  res.json(workspace);
});

// Delete a to-do
app.delete("/api/workspaces/:name/todos/:id", (req, res) => {
  const workspaces = loadWorkspaces();
  const workspace = workspaces[req.params.name];
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  workspace.todos = workspace.todos.filter((t) => t.id !== req.params.id);
  saveWorkspaces(workspaces);
  res.json(workspace);
});

// --- Notes routes ---

// Add a note
app.post("/api/workspaces/:name/notes", (req, res) => {
  const { title, content } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Note title is required" });
  }
  const workspaces = loadWorkspaces();
  const workspace = getOrCreateWorkspace(req.params.name);
  workspace.notes.push({
    id: uuidv4(),
    title: title.trim(),
    content: (content || "").trim(),
    createdBy: req.body.author || "Anonymous",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  workspaces[req.params.name] = workspace;
  saveWorkspaces(workspaces);
  res.status(201).json(workspace);
});

// Update a note
app.patch("/api/workspaces/:name/notes/:id", (req, res) => {
  const workspaces = loadWorkspaces();
  const workspace = workspaces[req.params.name];
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const note = workspace.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  note.updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  res.json(workspace);
});

// Delete a note
app.delete("/api/workspaces/:name/notes/:id", (req, res) => {
  const workspaces = loadWorkspaces();
  const workspace = workspaces[req.params.name];
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  workspace.notes = workspace.notes.filter((n) => n.id !== req.params.id);
  saveWorkspaces(workspaces);
  res.json(workspace);
});

// --- Start server ---

app.listen(PORT, async () => {
  console.log(`Shared Workspace running at http://localhost:${PORT}`);

  // Open a public tunnel if --tunnel flag is passed or TUNNEL env var is set
  if (process.argv.includes("--tunnel") || process.env.TUNNEL === "true") {
    try {
      const subdomain = process.env.TUNNEL_SUBDOMAIN || undefined;
      const tunnel = await localtunnel({ port: PORT, subdomain });

      console.log("\n--------------------------------------------");
      console.log("Public URL (share this with your coworker):");
      console.log(`  ${tunnel.url}`);
      console.log("--------------------------------------------\n");

      tunnel.on("close", () => {
        console.log("Tunnel closed.");
      });

      tunnel.on("error", (err) => {
        console.error("Tunnel error:", err.message);
      });
    } catch (err) {
      console.error("Failed to open tunnel:", err.message);
      console.log("The server is still running locally at http://localhost:" + PORT);
    }
  }
});
