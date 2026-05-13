<?php 
  $title = "QUEST LOG � REWARDS";
  include '../includes/header.php';
?>
<style>

  .reward-card { background: var(--card-bg); border: 3px solid var(--gold-dark); padding: 24px; text-align: center; transition: all 0.1s steps(1); position: relative; overflow: hidden; }
  .reward-card:hover { border-color:var(--gold); transform:translate(-2px,-2px); box-shadow:6px 6px 0 #000; }
  .reward-icon { font-size:48px; display:block; margin-bottom:16px; animation:floatUp 3s ease-in-out infinite; }
  .reward-cost { font-family:'VT323'; font-size:24px; color:var(--gold); margin:12px 0; }
  
  .delete-reward { position:absolute; top:8px; right:8px; background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:12px; opacity:0.3; transition:opacity 0.2s; }
  .reward-card:hover .delete-reward { opacity:1; }
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
  <div class="page-header" style="margin-bottom: 24px;">
    <h1 class="pixel-title">🎁 REWARDS</h1>
    <p class="pixel-subtitle">Complete quests to unlock rewards</p>
  </div>
  <button class="btn-pixel btn-pixel-purple" onclick="openRewardHistory()" style="width: 100%; margin-bottom: 32px; display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 10px;">
    📜 VIEW REWARD HISTORY
  </button>
  <div id="system-message" class="pixel-panel" style="display:none;margin-bottom:20px;">
    <span id="system-message-text" style="font-size:10px;"></span>
  </div>

  <div class="grid-3" id="rewards-container" style="margin-top:32px;">
    <!-- injected by js -->
    <div style="grid-column: 1 / -1; text-align:center; padding:60px; color:var(--text-dim); font-family:'VT323'; font-size:24px;">
      Loading your rewards...
    </div>
  </div>
</div>
<!-- REWARD HISTORY MODAL -->
<div id="reward-history-modal" class="pixel-modal" style="display:none;">
  <div class="pixel-panel" style="max-width:500px;margin:8% auto;position:relative;border-width:4px;">
    <button onclick="$('#reward-history-modal').fadeOut()" style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:20px;">&#x2716;</button>
    <h2 class="pixel-title" style="font-size:14px;margin-bottom:20px;">&#x1F4DC; REWARD HISTORY</h2>
    <div id="reward-history-content">
      <div style="text-align:center;padding:40px;color:var(--text-dim);font-family:'VT323';font-size:20px;">Loading...</div>
    </div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="module">
  import { db } from 'assets/js/db.js';
  window.db = db;
</script>
<script type="module" src="assets/js/pixel.js"></script>
<script type="module" src="assets/js/user_rewards.js"></script>
</body>
</html>

