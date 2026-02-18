# Shared Workspace

A lightweight collaborative workspace where you and your coworkers can share to-do lists and notes in real time.

## Features

- **Shared To-Do Lists** - Add, check off, and delete tasks. See who created each task.
- **Shared Notes** - Create notes with titles, click to edit content, and collaborate.
- **Workspace Rooms** - Join a workspace by name. Anyone with the same workspace name sees the same data.
- **Auto-Sync** - The UI polls every 3 seconds so both users see updates without refreshing.
- **Persistent Storage** - Data is saved to a local JSON file so it survives server restarts.
- **Public Tunnel** - Share across different networks with a single command. No port forwarding or deployment needed.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

**Local only** (same network):

```bash
npm start
```

**With public tunnel** (different networks):

```bash
npm run tunnel
```

This prints a public URL like `https://xyz.loca.lt` in the terminal. Send that URL to your coworker and you're both connected.

You can also request a stable subdomain:

```bash
TUNNEL_SUBDOMAIN=my-team npm run tunnel
```

The app runs on port **3000** by default. Set the `PORT` environment variable to change this.

### 3. Share with your coworker

Both of you open the app (either `http://localhost:3000` or the public tunnel URL). Enter the **same workspace name** (e.g. `project-alpha`) and your own display name, then click **Join Workspace**.

You'll both see the same to-do list and notes, updated in real time.

## Project Structure

```
├── server.js          # Express API server
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Main HTML page
│   ├── style.css      # Styles
│   └── app.js         # Frontend logic
└── data/              # Auto-created, stores workspace JSON (git-ignored)
```

## API Endpoints

| Method   | Endpoint                            | Description          |
|----------|-------------------------------------|----------------------|
| `GET`    | `/api/workspaces/:name`             | Get/create workspace |
| `POST`   | `/api/workspaces/:name/todos`       | Add a to-do          |
| `PATCH`  | `/api/workspaces/:name/todos/:id`   | Update a to-do       |
| `DELETE` | `/api/workspaces/:name/todos/:id`   | Delete a to-do       |
| `POST`   | `/api/workspaces/:name/notes`       | Add a note           |
| `PATCH`  | `/api/workspaces/:name/notes/:id`   | Update a note        |
| `DELETE` | `/api/workspaces/:name/notes/:id`   | Delete a note        |
