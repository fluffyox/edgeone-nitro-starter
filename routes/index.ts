import { defineHandler } from "nitro";

export default defineHandler(() => {
  return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; height: 100vh; display: flex; color: #333; }

    /* Sidebar */
    .sidebar { width: 280px; background: #f5f5f5; border-right: 1px solid #ddd; display: flex; flex-direction: column; flex-shrink: 0; }
    .sidebar-header { padding: 16px; border-bottom: 1px solid #ddd; display: flex; gap: 8px; }
    .sidebar-header button { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 13px; }
    .sidebar-header button:hover { background: #e8e8e8; }
    .breadcrumb { padding: 8px 16px; font-size: 12px; color: #888; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 2px; }
    .breadcrumb span { cursor: pointer; color: #0066ff; }
    .breadcrumb span:last-child { color: #333; cursor: default; }
    .file-list { flex: 1; overflow-y: auto; }
    .file-item { padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; border-bottom: 1px solid #eee; }
    .file-item:hover { background: #e8e8e8; }
    .file-item.active { background: #d4e4ff; }
    .file-item .icon { font-size: 16px; flex-shrink: 0; }
    .file-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-item .del { color: #cc0000; font-size: 12px; padding: 2px 6px; border-radius: 3px; opacity: 0; }
    .file-item:hover .del { opacity: 1; }
    .file-item .del:hover { background: #ffdddd; }

    /* Editor */
    .editor { flex: 1; display: flex; flex-direction: column; }
    .editor-header { padding: 12px 20px; border-bottom: 1px solid #ddd; font-size: 14px; color: #666; display: flex; align-items: center; justify-content: space-between; }
    .editor-header .path { font-weight: 600; color: #333; }
    .editor-header .status { font-size: 12px; }
    .editor textarea { flex: 1; padding: 20px; border: none; outline: none; resize: none; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; line-height: 1.6; }
    .empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 16px; }

    /* Dialog */
    .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 10; align-items: center; justify-content: center; }
    .overlay.show { display: flex; }
    .dialog { background: #fff; border-radius: 8px; padding: 24px; width: 400px; box-shadow: 0 8px 30px rgba(0,0,0,.15); }
    .dialog h3 { margin-bottom: 16px; }
    .dialog input { width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; margin-bottom: 16px; }
    .dialog .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .dialog button { padding: 6px 16px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .dialog button.primary { background: #0066ff; color: #fff; border-color: #0066ff; }
  </style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-header">
    <button onclick="showNewDialog('file')">+ New File</button>
    <button onclick="showNewDialog('folder')">+ New Folder</button>
  </div>
  <div class="breadcrumb" id="breadcrumb"></div>
  <div class="file-list" id="fileList"></div>
</div>

<div class="editor" id="editorPane">
  <div class="empty" id="emptyState">Select or create a note</div>
</div>

<!-- New File/Folder Dialog -->
<div class="overlay" id="newDialog">
  <div class="dialog">
    <h3 id="dialogTitle">New File</h3>
    <input id="dialogInput" placeholder="filename.md" autofocus />
    <div class="actions">
      <button onclick="closeDialog()">Cancel</button>
      <button class="primary" onclick="confirmNew()">Create</button>
    </div>
  </div>
</div>

<script>
const API = '/api/notes';
let currentPath = '';  // current directory prefix
let openFile = null;   // currently open file path
let saveTimer = null;
let dialogMode = 'file';

// ── Load file list ──
async function loadList(path) {
  currentPath = path || '';
  const res = await fetch(API + '?path=' + encodeURIComponent(currentPath));
  const data = await res.json();
  renderBreadcrumb();
  renderList(data.folders, data.files);
}

function renderBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  const parts = currentPath.split('/').filter(Boolean);
  let html = '<span onclick="loadList(\\'\\')">/</span>';
  let acc = '';
  for (const p of parts) {
    acc += p + '/';
    const path = acc;
    html += ' <span onclick="loadList(\\'' + path + '\\')">' + p + '/</span>';
  }
  el.innerHTML = html;
}

function renderList(folders, files) {
  const el = document.getElementById('fileList');
  let html = '';
  for (const f of folders) {
    html += '<div class="file-item" onclick="loadList(\\'' + f.key + '\\')">'
      + '<span class="icon">📁</span><span class="name">' + f.name.replace(/\\/$/, '') + '</span></div>';
  }
  for (const f of files) {
    const active = f.key === openFile ? ' active' : '';
    html += '<div class="file-item' + active + '" onclick="openNote(\\'' + f.key + '\\')">'
      + '<span class="icon">📄</span><span class="name">' + f.name + '</span>'
      + '<span class="del" onclick="event.stopPropagation();deleteNote(\\'' + f.key + '\\')">×</span></div>';
  }
  if (!folders.length && !files.length) {
    html = '<div style="padding:20px;color:#aaa;text-align:center">Empty</div>';
  }
  el.innerHTML = html;
}

// ── Open note ──
async function openNote(path) {
  openFile = path;
  const res = await fetch(API + '/' + encodeURIComponent(path));
  if (!res.ok) return;
  const data = await res.json();

  const pane = document.getElementById('editorPane');
  pane.innerHTML = '<div class="editor-header"><span class="path">' + path + '</span><span class="status" id="saveStatus">Saved</span></div>'
    + '<textarea id="editor" spellcheck="false"></textarea>';
  document.getElementById('editor').value = data.content;
  document.getElementById('editor').addEventListener('input', onEdit);
  loadList(currentPath);
}

// ── Auto-save ──
function onEdit() {
  document.getElementById('saveStatus').textContent = 'Unsaved...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNote, 800);
}

async function saveNote() {
  if (!openFile) return;
  const content = document.getElementById('editor').value;
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: openFile, content }),
  });
  const s = document.getElementById('saveStatus');
  if (s) s.textContent = 'Saved';
}

// ── Delete ──
async function deleteNote(path) {
  if (!confirm('Delete ' + path + '?')) return;
  await fetch(API, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (openFile === path) {
    openFile = null;
    document.getElementById('editorPane').innerHTML = '<div class="empty">Select or create a note</div>';
  }
  loadList(currentPath);
}

// ── New file/folder dialog ──
function showNewDialog(mode) {
  dialogMode = mode;
  document.getElementById('dialogTitle').textContent = mode === 'file' ? 'New File' : 'New Folder';
  document.getElementById('dialogInput').placeholder = mode === 'file' ? 'filename.md' : 'folder-name';
  document.getElementById('dialogInput').value = '';
  document.getElementById('newDialog').classList.add('show');
  setTimeout(() => document.getElementById('dialogInput').focus(), 50);
}

function closeDialog() {
  document.getElementById('newDialog').classList.remove('show');
}

async function confirmNew() {
  let name = document.getElementById('dialogInput').value.trim();
  if (!name) return;
  closeDialog();

  if (dialogMode === 'file') {
    if (!name.includes('.')) name += '.md';
    const path = currentPath + name;
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: '' }),
    });
    await loadList(currentPath);
    openNote(path);
  } else {
    // Create folder by writing a placeholder, then delete it — or just write an .empty file
    const path = currentPath + name + '/.keep';
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: '' }),
    });
    loadList(currentPath);
  }
}

// Enter key in dialog
document.getElementById('dialogInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmNew();
  if (e.key === 'Escape') closeDialog();
});

// Init
loadList('');
</script>
</body>
</html>`;
});
