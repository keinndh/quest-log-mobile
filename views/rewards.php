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
  <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px;">
    <div>
      <h1 class="pixel-title">🎁 REWARDS</h1>
      <p class="pixel-subtitle">Create and redeem your own custom rewards</p>
    </div>
    <button class="btn-pixel btn-pixel-gold" onclick="$('#add-reward-modal').fadeIn()">➕ NEW REWARD</button>
  </div>

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

<!-- ADD REWARD MODAL -->
<div id="add-reward-modal" class="pixel-modal" style="display:none;">
  <div class="pixel-panel" style="max-width:500px;margin:10% auto;position:relative;">
    <h2 class="pixel-title" style="font-size:14px;margin-bottom:20px;">🎁 CREATE REWARD</h2>
    <form id="add-reward-form">
      <div style="margin-bottom:16px;">
        <label class="pixel-label">REWARD NAME *</label>
        <input type="text" id="reward-title" class="pixel-input" placeholder="e.g. 1 Hour of Gaming" required>
      </div>
      <div class="grid-2" style="gap:20px;margin-bottom:16px;">
        <div>
          <label class="pixel-label">GOLD COST *</label>
          <input type="number" id="reward-cost" class="pixel-input" value="100" min="1" required>
        </div>
        <div>
          <label class="pixel-label">ICON</label>
          <select id="reward-icon" class="pixel-select pixel-input">
            <option value="🎁">🎁 Box</option>
            <option value="🍕">🍕 Food</option>
            <option value="🎮">🎮 Game</option>
            <option value="🎬">🎬 Movie</option>
            <option value="😴">😴 Sleep</option>
            <option value="🍦">🍦 Treat</option>
            <option value="🎟️">🎟️ Ticket</option>
            <option value="💖">💖 Favor</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <label class="pixel-label">DESCRIPTION (OPTIONAL)</label>
        <textarea id="reward-desc" class="pixel-textarea pixel-input" rows="2" placeholder="Describe the reward..."></textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <button type="submit" class="btn-pixel btn-pixel-gold">✨ CREATE</button>
        <button type="button" class="btn-pixel btn-pixel-outline" onclick="$('#add-reward-modal').fadeOut()">CANCEL</button>
      </div>
    </form>
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

