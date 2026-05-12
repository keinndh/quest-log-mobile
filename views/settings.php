<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QUEST LOG — SETTINGS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/pixel.css">
<link rel="manifest" href="../manifest.json">
<style>
  .nav-xp-mini { font-size: 7px; color: var(--text-dim); }
  .nav-player-wrap { display:flex; align-items:center; gap:12px; padding: 0 16px; border-left: 2px solid rgba(255,215,0,0.2); }
  .nav-level-badge { font-size:9px; color:#000; background:var(--gold); padding:4px 8px; font-family:'Press Start 2P',monospace; }

  .settings-section { background:var(--card-bg); border:3px solid var(--gold-dark); padding:24px; margin-bottom:16px; }
  .settings-section h3 { font-size:11px; color:var(--gold); margin-bottom:16px; }
  .danger-zone { border-color: var(--accent-red) !important; }
  .danger-zone h3 { color: var(--accent-red) !important; }
</style>
</head>
<body>
<div class="scanlines"></div>

<nav class="nav-pixel">
  <div class="nav-logo-wrap">
    <button id="menu-toggle" class="btn-pixel" style="padding:8px 12px; font-size:20px; background:transparent; border-color:rgba(255,215,0,0.3);">☰</button>
    <a href="../index.html" class="nav-logo">
      <span style="font-size:24px;">⚔️</span>
      <span>QUEST<br><span style="color:var(--purple-glow);font-size:10px;">LOG</span></span>
    </a>
  </div>

  <div class="nav-player-wrap">
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="nav-level-badge" id="nav-level">LV--</span>
        <span style="font-size:8px;color:var(--gold);" id="nav-name">---</span>
      </div>
      <div class="nav-xp-mini" style="margin-top:4px;" id="nav-xp-text">0/0 XP</div>
      <div class="xp-bar-wrap" style="height:6px;margin-top:3px;width:120px;">
        <div class="xp-bar-fill" id="nav-xp-fill" style="width:0%;"></div>
      </div>
    </div>
    <div style="font-family:'VT323';font-size:18px;color:var(--gold);" id="nav-gold">💰 0G</div>
  </div>
</nav>

<div class="page-container" style="padding-top: 80px;">
  <div class="page-header">
    <h1 class="pixel-title">⚙️ SETTINGS</h1>
    <p class="pixel-subtitle">Configure your adventure</p>
  </div>

  <div id="system-message" class="pixel-panel" style="display:none;margin-bottom:16px;">
    <span id="system-message-text" style="font-size:10px;"></span>
  </div>

  <!-- Account Info -->
  <div class="settings-section">
    <h3 class="pixel-title">👤 ACCOUNT OVERVIEW</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;" id="account-info-grid">
      <!-- injected by js -->
    </div>
    <div style="margin-top:20px; border-top:1px solid rgba(255,215,0,0.1); padding-top:20px;">
        <button onclick="forceSync()" class="btn-pixel btn-pixel-purple">☁️ FORCE CLOUD SYNC</button>
        <p style="font-family:'VT323';font-size:14px;color:var(--text-dim);margin-top:10px;">Manually push your local data to the cloud.</p>
    </div>
  </div>
 
  <!-- Login Credentials -->
  <div class="settings-section">
    <h3 class="pixel-title">🔐 LOGIN CREDENTIALS</h3>
    <form id="auth-settings-form" style="max-width: 400px;">
      <div style="margin-bottom:16px;">
        <label class="pixel-label" style="font-size:8px;margin-bottom:8px;display:block;">CURRENT PASSWORD</label>
        <input type="password" id="current-password" class="pixel-input" placeholder="••••••••" required>
      </div>
      <div style="margin-bottom:16px;">
        <label class="pixel-label" style="font-size:8px;margin-bottom:8px;display:block;">NEW PASSWORD</label>
        <input type="password" id="new-password" class="pixel-input" placeholder="••••••••">
      </div>
      <div style="margin-bottom:16px;">
        <label class="pixel-label" style="font-size:8px;margin-bottom:8px;display:block;">CONFIRM PASSWORD</label>
        <input type="password" id="confirm-password" class="pixel-input" placeholder="••••••••">
      </div>
      <button type="submit" class="btn-pixel btn-pixel-gold">💾 UPDATE PASSWORD</button>
    </form>
  </div>
  
  <!-- Data Management -->
  <div class="settings-section">
    <h3 class="pixel-title">💾 DATA MANAGEMENT</h3>
    <p style="font-family:'VT323';font-size:16px;color:var(--text-dim);margin-bottom:16px;">
      Backup your adventure data or restore from a previous save.
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <button onclick="exportData()" class="btn-pixel btn-pixel-gold">📤 EXPORT BACKUP (JSON)</button>
      <button onclick="$('#import-file').click()" class="btn-pixel btn-pixel-purple">📥 IMPORT BACKUP</button>
      <input type="file" id="import-file" style="display:none;" accept=".json" onchange="importData(this)">
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="settings-section danger-zone">
    <h3 class="pixel-title">⚠️ DANGER ZONE</h3>
    <p style="font-family:'VT323';font-size:16px;color:var(--text-dim);margin-bottom:16px;">
      These actions are permanent and cannot be undone!
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <button onclick="resetProgress()" class="btn-pixel btn-pixel-outline" style="color:var(--accent-orange);border-color:var(--accent-orange);">🗑️ RESET ALL PROGRESS</button>
      <button onclick="deleteAccount()" class="btn-pixel btn-pixel-red">💀 DELETE ACCOUNT PERMANENTLY</button>
    </div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="module">
  import { db } from '../assets/js/db.js';
  window.db = db;
</script>
<script type="module" src="../assets/js/pixel.js"></script>
<script type="module" src="../assets/js/settings.js"></script>
</body>
</html>
