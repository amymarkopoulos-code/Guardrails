(function () {
  "use strict";

  // --- State ---
  let workspaceName = "";
  let displayName = "";
  let currentWorkspace = null;
  let editingNoteId = null;
  let pollInterval = null;

  // --- DOM refs ---
  const joinScreen = document.getElementById("join-screen");
  const workspaceScreen = document.getElementById("workspace-screen");
  const joinForm = document.getElementById("join-form");
  const wsInput = document.getElementById("workspace-name");
  const nameInput = document.getElementById("display-name");
  const wsTitle = document.getElementById("workspace-title");
  const userBadge = document.getElementById("user-badge");
  const leaveBtn = document.getElementById("leave-btn");

  const todoForm = document.getElementById("todo-form");
  const todoInput = document.getElementById("todo-input");
  const todoList = document.getElementById("todo-list");

  const noteForm = document.getElementById("note-form");
  const noteTitleInput = document.getElementById("note-title-input");
  const notesList = document.getElementById("notes-list");

  const noteModal = document.getElementById("note-modal");
  const modalTitle = document.getElementById("modal-note-title");
  const modalContent = document.getElementById("modal-note-content");
  const modalClose = document.getElementById("modal-close");
  const modalSave = document.getElementById("modal-save");

  // --- API helpers ---
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch("/api/workspaces/" + encodeURIComponent(workspaceName) + path, opts);
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  async function loadWorkspace() {
    currentWorkspace = await api("GET", "");
    renderTodos();
    renderNotes();
  }

  // --- Render To-Dos ---
  function renderTodos() {
    if (!currentWorkspace || currentWorkspace.todos.length === 0) {
      todoList.innerHTML = '<li class="empty-state">No tasks yet. Add one above.</li>';
      return;
    }
    todoList.innerHTML = currentWorkspace.todos
      .map(
        (t) => `
      <li>
        <input type="checkbox" ${t.done ? "checked" : ""} data-todo-id="${t.id}" />
        <span class="todo-text ${t.done ? "done" : ""}">${escapeHtml(t.text)}</span>
        <span class="todo-author">${escapeHtml(t.createdBy)}</span>
        <button class="btn-delete" data-delete-todo="${t.id}" title="Delete">&times;</button>
      </li>`
      )
      .join("");
  }

  // --- Render Notes ---
  function renderNotes() {
    if (!currentWorkspace || currentWorkspace.notes.length === 0) {
      notesList.innerHTML = '<div class="empty-state">No notes yet. Add one above.</div>';
      return;
    }
    notesList.innerHTML = currentWorkspace.notes
      .map(
        (n) => `
      <div class="note-card" data-note-id="${n.id}">
        <div class="note-card-header">
          <h3>${escapeHtml(n.title)}</h3>
          <button class="btn-delete" data-delete-note="${n.id}" title="Delete">&times;</button>
        </div>
        <div class="note-meta">by ${escapeHtml(n.createdBy)} &middot; ${formatDate(n.updatedAt)}</div>
        ${n.content ? `<div class="note-preview">${escapeHtml(n.content)}</div>` : ""}
      </div>`
      )
      .join("");
  }

  // --- Event handlers ---

  // Join workspace
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    workspaceName = wsInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    displayName = nameInput.value.trim();
    if (!workspaceName || !displayName) return;

    // Save to localStorage for convenience
    localStorage.setItem("ws_workspace", workspaceName);
    localStorage.setItem("ws_displayName", displayName);

    await enterWorkspace();
  });

  async function enterWorkspace() {
    await loadWorkspace();
    joinScreen.classList.add("hidden");
    workspaceScreen.classList.remove("hidden");
    wsTitle.textContent = workspaceName;
    userBadge.textContent = displayName;

    // Poll for updates every 3 seconds
    pollInterval = setInterval(loadWorkspace, 3000);
  }

  // Leave workspace
  leaveBtn.addEventListener("click", () => {
    clearInterval(pollInterval);
    workspaceScreen.classList.add("hidden");
    joinScreen.classList.remove("hidden");
    localStorage.removeItem("ws_workspace");
    localStorage.removeItem("ws_displayName");
  });

  // Add to-do
  todoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    await api("POST", "/todos", { text, author: displayName });
    todoInput.value = "";
    await loadWorkspace();
  });

  // Toggle / delete to-do (event delegation)
  todoList.addEventListener("click", async (e) => {
    const checkbox = e.target.closest("input[type='checkbox']");
    if (checkbox) {
      const id = checkbox.dataset.todoId;
      await api("PATCH", "/todos/" + id, { done: checkbox.checked });
      await loadWorkspace();
      return;
    }
    const delBtn = e.target.closest("[data-delete-todo]");
    if (delBtn) {
      const id = delBtn.dataset.deleteTodo;
      await api("DELETE", "/todos/" + id);
      await loadWorkspace();
    }
  });

  // Add note
  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = noteTitleInput.value.trim();
    if (!title) return;
    await api("POST", "/notes", { title, content: "", author: displayName });
    noteTitleInput.value = "";
    await loadWorkspace();
  });

  // Click note card to edit / delete note (event delegation)
  notesList.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete-note]");
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.deleteNote;
      await api("DELETE", "/notes/" + id);
      await loadWorkspace();
      return;
    }
    const card = e.target.closest(".note-card");
    if (card) {
      const id = card.dataset.noteId;
      const note = currentWorkspace.notes.find((n) => n.id === id);
      if (!note) return;
      openNoteModal(note);
    }
  });

  // --- Note modal ---
  function openNoteModal(note) {
    editingNoteId = note.id;
    modalTitle.textContent = note.title;
    modalContent.value = note.content || "";
    noteModal.classList.remove("hidden");
    modalContent.focus();
  }

  modalClose.addEventListener("click", () => {
    noteModal.classList.add("hidden");
    editingNoteId = null;
  });

  noteModal.addEventListener("click", (e) => {
    if (e.target === noteModal) {
      noteModal.classList.add("hidden");
      editingNoteId = null;
    }
  });

  modalSave.addEventListener("click", async () => {
    if (!editingNoteId) return;
    await api("PATCH", "/notes/" + editingNoteId, {
      content: modalContent.value,
    });
    noteModal.classList.add("hidden");
    editingNoteId = null;
    await loadWorkspace();
  });

  // --- Utilities ---
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // --- Auto-rejoin from localStorage ---
  (function autoJoin() {
    const savedWs = localStorage.getItem("ws_workspace");
    const savedName = localStorage.getItem("ws_displayName");
    if (savedWs && savedName) {
      wsInput.value = savedWs;
      nameInput.value = savedName;
    }
  })();
})();
