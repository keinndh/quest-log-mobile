<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QUEST LOG — ACHIEVEMENTS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/pixel.css">
<link rel="manifest" href="../manifest.json">
<style>

  .ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .ach-card {
    background: var(--card-bg);
    border: 3px solid var(--gold-dark);
    padding: 20px 16px;
    text-align: center;
    position: relative;
    transition: all 0.1s steps(1);
    cursor: default;
  }
  .ach-card.unlocked { border-color: var(--gold); }
  .ach-card.unlocked:hover { transform: translate(-3px,-3px); box-shadow: 6px 6px 0 #000, var(--shadow-gold); }
  .ach-card.locked { filter: grayscale(0.7) brightness(0.4); }
  .rarity-mythic { border-color: var(--accent-red) !important; box-shadow: 0 0 12px rgba(255,34,68,0.3); }
  .rarity-legendary { border-color: var(--accent-orange) !important; box-shadow: 0 0 10px rgba(255,102,0,0.3); }
  .rarity-epic { border-color: var(--purple-glow) !important; box-shadow: 0 0 10px rgba(204,68,255,0.3); }
  .rarity-rare { border-color: var(--accent-cyan) !important; }
  .rarity-uncommon { border-color: var(--accent-green) !important; }
  .ach-icon { font-size: 40px; display: block; margin-bottom: 12px; }
  .ach-title { font-size: 8px; color: var(--gold); margin-bottom: 8px; line-height: 1.6; }
  .ach-desc { font-family:'VT323'; font-size: 14px; color: var(--text-dim); }
  .ach-xp { font-family:'VT323'; font-size:16px; color:var(--gold); margin-top:8px; }
  .lock-overlay {
    position: absolute;
    top: 8px; right: 8px;
    font-size: 14px;
    opacity: 0.5;
  }
  .filter-btn { font-family:'Press Start 2P',monospace; font-size:8px; padding:8px 14px; cursor:pointer; border:2px solid var(--gold-dark); background:transparent; color:var(--text-dim); text-decoration:none; transition:all 0.1s steps(1); display:inline-block; }
  .filter-btn:hover, .filter-btn.active { background:var(--gold); color:#000; border-color:var(--gold); }
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
    <div style="font-family:'VT323';font-size:18px;color:var(--gold);" id="nav-gold">
      💰 0G
    </div>
  </div>
</nav>

<div class="page-container" style="padding-top: 80px;">
  <div class="page-header">
    <h1 class="pixel-title">🏆 ACHIEVEMENT HALL</h1>
    <p class="pixel-subtitle">Prove your worth, legendary hero</p>
  </div>

  <!-- Progress Summary -->
  <div class="pixel-panel section-gap">
    <div style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:9px;color:var(--text-dim);">ACHIEVEMENT PROGRESS</span>
          <span style="font-size:9px;color:var(--gold);" id="ach-count-text">0 / 0 UNLOCKED</span>
        </div>
        <div class="xp-bar-wrap" style="height:28px;">
          <div class="xp-bar-fill" id="ach-pct-fill" style="width:0%;"></div>
          <div class="xp-bar-text" id="ach-pct-text">0% COMPLETE</div>
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:36px;color:var(--gold);">🏆</div>
        <div style="font-size:8px;color:var(--text-dim);margin-top:4px;">HALL OF FAME</div>
      </div>
    </div>

    <!-- Rarity counts -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;" id="rarity-counts-container">
      <!-- injected by js -->
    </div>
  </div>

  <!-- Filters -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
    <a href="#" data-filter="all" class="filter-btn ach-filter active">ALL</a>
    <a href="#" data-filter="unlocked" class="filter-btn ach-filter">✓ UNLOCKED</a>
    <a href="#" data-filter="locked" class="filter-btn ach-filter">🔒 LOCKED</a>
  </div>

  <!-- Achievement Grid -->
  <div class="ach-grid" id="ach-grid-container">
    <div style="text-align:center;padding:40px;color:var(--text-dim);font-family:'VT323';font-size:24px;grid-column:1/-1;">Loading achievements...</div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="module">
  import { db } from '../assets/js/db.js';
  window.db = db;
</script>
<script type="module" src="../assets/js/pixel.js"></script>
<script type="module" src="../assets/js/achievements.js"></script>
</body>
</html>
