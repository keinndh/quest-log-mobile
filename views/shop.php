<?php 
  $title = "QUEST LOG � SHOP";
  include '../includes/header.php';
?>
<style>

  .shop-item { background: var(--card-bg); border: 3px solid var(--gold-dark); padding: 24px; text-align: center; transition: all 0.1s steps(1); position: relative; overflow: hidden; }
  .shop-item::after { content:''; position:absolute; top:0;left:0;right:0; height:2px; background:linear-gradient(90deg,transparent,var(--gold),transparent); }
  .shop-item:hover { border-color:var(--gold); transform:translate(-2px,-2px); box-shadow:6px 6px 0 #000, var(--shadow-gold); }
  .shop-icon { font-size:48px; display:block; margin-bottom:16px; animation:floatUp 3s ease-in-out infinite; }
  .shop-price { font-family:'VT323'; font-size:24px; color:var(--gold); margin:12px 0; }
  .featured { border-color:var(--accent-orange) !important; box-shadow:0 0 15px rgba(255,102,0,0.3); }
  .featured::before { content:'★ BEST VALUE ★'; position:absolute; top:-1px; left:50%; transform:translateX(-50%); background:var(--accent-orange); color:#000; font-size:7px; padding:3px 10px; white-space:nowrap; }
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
  <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
    <div>
      <h1 class="pixel-title">🛒 HERO SHOP</h1>
      <p class="pixel-subtitle">Spend your hard-earned gold, adventurer</p>
    </div>
    <div class="pixel-panel" style="padding:16px 24px; text-align:center; max-width:200px; margin:0 auto 20px;">
      <div style="font-size:28px;color:var(--gold);font-family:'VT323';" id="shop-gold-display">💰 0G</div>
      <div style="font-size:7px;color:var(--text-dim);">YOUR GOLD</div>
    </div>
  </div>

  <div id="system-message" class="pixel-panel" style="display:none;margin-bottom:20px;">
    <span id="system-message-text" style="font-size:10px;"></span>
  </div>

  <!-- XP Scrolls -->
  <div class="section-gap">
    <h2 class="pixel-title" style="font-size:14px;margin-bottom:20px;">📜 XP SCROLLS</h2>
    <div class="grid-3" id="xp-items-container">
      <!-- injected by js -->
    </div>
  </div>

  <!-- Weapons -->
  <div class="section-gap">
    <h2 class="pixel-title" style="font-size:14px;margin-bottom:20px;">⚔️ WEAPON ARMORY</h2>
    <div id="weapons-shop-container">
      <!-- Rarity rows injected by js -->
    </div>
  </div>

  <!-- Gold tips -->
  <div class="pixel-panel section-gap">
    <h3 class="pixel-title" style="font-size:11px;margin-bottom:16px;">💡 HOW TO EARN GOLD</h3>
    <div class="grid-2">
      <div style="font-family:'VT323';font-size:16px;color:var(--text-dim);line-height:1.8;">
        <div>⚔️ Easy quest = 10 gold</div>
        <div>🗡️ Medium quest = 25 gold</div>
      </div>
      <div style="font-family:'VT323';font-size:16px;color:var(--text-dim);line-height:1.8;">
        <div>💀 Hard quest = 50 gold</div>
        <div>🌟 Legendary quest = 150 gold</div>
      </div>
    </div>
  </div>
</div>

<div id="achievement-toast" class="achievement-toast">
  <div style="display:flex;align-items:center;gap:12px;">
    <span id="toast-icon" style="font-size:32px;"></span>
    <div>
      <div style="font-size:8px;color:var(--gold);margin-bottom:4px;">🏆 ACHIEVEMENT UNLOCKED!</div>
      <div id="toast-title" style="font-size:9px;color:var(--text-main);"></div>
      <div id="toast-desc" style="font-family:'VT323';font-size:14px;color:var(--text-dim);margin-top:2px;"></div>
    </div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="module">
  import { db } from 'assets/js/db.js';
  window.db = db;
</script>
<script type="module" src="assets/js/pixel.js"></script>
<script type="module" src="assets/js/shop.js"></script>
</body>
</html>

