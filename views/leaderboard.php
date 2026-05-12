<?php 
  $title = "QUEST LOG � LEADERBOARD";
  include '../includes/header.php';
?>
<style>

  .rank-card {
    background: radial-gradient(ellipse at top, rgba(155,0,255,0.2), rgba(13,0,21,0.95));
    border: 4px solid var(--gold);
    padding: 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
    animation: glowPulse 3s ease-in-out infinite;
  }
  .rank-badge-big { font-size: 80px; display:block; margin-bottom:16px; animation:floatUp 3s ease-in-out infinite; }
  .milestone-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px;
    background: var(--card-bg);
    border: 2px solid var(--gold-dark);
    margin-bottom: 8px;
  }
  .milestone-done { border-color: var(--accent-green) !important; }
</style>
</head>
<body>
<div class="scanlines"></div>

<nav class="nav-pixel">
  <div class="nav-logo-wrap">
    <button id="menu-toggle" class="btn-pixel" style="padding:8px 12px; font-size:20px; background:transparent; border-color:rgba(255,215,0,0.3);">☰</button>
    <a href="?page=dashboard" class="nav-logo">
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
    <h1 class="pixel-title">👑 HALL OF RANKS</h1>
    <p class="pixel-subtitle">Your standing among the greatest heroes</p>
  </div>

  <!-- Current Rank -->
  <div class="rank-card pixel-border section-gap">
    <span class="rank-badge-big" id="rank-icon-big">⚔️</span>
    <h2 class="pixel-title" style="font-size:20px;margin-bottom:8px;" id="rank-title-big">COMMON WARRIOR</h2>
    <p class="pixel-subtitle" style="font-size:16px;margin-bottom:20px;">Current Rank of <span id="rank-player-name">Hero</span></p>
    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;" id="rank-badges-container">
      <!-- injected by js -->
    </div>
  </div>

  <div class="grid-2 section-gap">
    <!-- Rank Tiers -->
    <div class="pixel-panel">
      <h3 class="pixel-title" style="font-size:11px;margin-bottom:20px;">🎖️ RANK TIERS</h3>
      <div id="tiers-container">
        <!-- injected by js -->
      </div>
    </div>

    <!-- Milestones Progress -->
    <div class="pixel-panel">
      <h3 class="pixel-title" style="font-size:11px;margin-bottom:20px;">🎯 MILESTONE TRACKER</h3>
      <div id="milestones-container">
        <!-- injected by js -->
      </div>
    </div>
  </div>

  <!-- Score Summary -->
  <div class="pixel-panel">
    <h3 class="pixel-title" style="font-size:11px;margin-bottom:20px;">📊 YOUR SCORE BREAKDOWN</h3>
    <div id="score-breakdown-container">
      <!-- injected by js -->
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:3px solid var(--gold);margin-top:4px;">
      <div style="font-size:10px;color:var(--gold);">TOTAL HERO SCORE</div>
      <div style="font-size:28px;color:var(--gold);text-shadow:0 0 20px rgba(255,215,0,0.5);" id="total-score">0</div>
    </div>
    <a href="?page=stats" class="btn-pixel btn-pixel-outline" style="margin-top:20px; display:inline-block;">📊 VIEW FULL STATS →</a>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="module">
  import { db } from 'assets/js/db.js';
  window.db = db;
</script>
<script type="module" src="assets/js/pixel.js"></script>
<script type="module" src="assets/js/leaderboard.js"></script>
</body>
</html>

