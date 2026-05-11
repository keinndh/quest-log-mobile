<?php
// includes/nav.php
$db = getDB();
$player = getPlayer($db);
$gold = getGold($db);
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$totalQuests = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1");
$newAchCount = $db->querySingle("SELECT COUNT(*) FROM achievements WHERE unlocked=1 AND unlocked_at >= datetime('now','-1 day')");

$inPages = strpos($_SERVER['PHP_SELF'], '/pages/') !== false;
$base    = $inPages ? '' : 'pages/';
$rootBase = $inPages ? '../' : '';

$navItems = [
    ['href' => $rootBase.'index.html',    'icon' => '🏰', 'label' => 'KINGDOM',      'page' => 'index'],
    ['href' => $base.'quests.html',       'icon' => '📜', 'label' => 'QUESTS',        'page' => 'quests'],
    ['href' => $base.'character.html',    'icon' => '⚔️', 'label' => 'CHARACTER',    'page' => 'character'],
    ['href' => $base.'achievements.html', 'icon' => '🏆', 'label' => 'ACHIEVEMENTS',  'page' => 'achievements'],
    ['href' => $base.'shop.html',         'icon' => '🛒', 'label' => 'SHOP',          'page' => 'shop'],
    ['href' => $base.'user_rewards.html',  'icon' => '🎁', 'label' => 'REWARDS',       'page' => 'user_rewards'],
    ['href' => $base.'stats.html',        'icon' => '📊', 'label' => 'STATS',         'page' => 'stats'],
    ['href' => $base.'leaderboard.html',  'icon' => '👑', 'label' => 'RANKS',         'page' => 'leaderboard'],
    ['href' => $base.'daily-log.html',    'icon' => '📅', 'label' => 'DAILY LOG',     'page' => 'daily-log'],
    ['href' => $base.'settings.html',     'icon' => '⚙️', 'label' => 'SETTINGS',     'page' => 'settings'],
];

$xpPct = $player['xp_next'] > 0 ? round(($player['xp'] / $player['xp_next']) * 100) : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QUEST LOG — <?= strtoupper($currentPage) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= $rootBase ?>assets/css/pixel.css">
<style>
  .nav-xp-mini { font-size: 7px; color: var(--text-dim); }
  .nav-player-wrap { display:flex; align-items:center; gap:12px; padding: 0 16px; border-left: 2px solid rgba(255,215,0,0.2); }
  .nav-level-badge { font-size:9px; color:#000; background:var(--gold); padding:4px 8px; font-family:'Press Start 2P',monospace; }
</style>
</head>
<body>
<div class="scanlines"></div>

<nav class="nav-pixel">
  <a href="<?= $rootBase ?>index.html" class="nav-logo">
    <span style="font-size:24px;">⚔️</span>
    <span>QUEST<br><span style="color:var(--purple-glow);font-size:10px;">LOG</span></span>
  </a>

  <ul class="nav-links">
    <?php foreach ($navItems as $item):
      $active = (strpos($_SERVER['PHP_SELF'], $item['page']) !== false) ? 'active' : '';
    ?>
    <li>
      <a href="<?= $item['href'] ?>" class="<?= $active ?>" style="position:relative;">
        <span style="font-size:14px;"><?= $item['icon'] ?></span>
        <?= $item['label'] ?>
        <?php if ($item['page'] === 'achievements' && $newAchCount > 0): ?>
          <span class="notif-dot"></span>
        <?php endif; ?>
      </a>
    </li>
    <?php endforeach; ?>
    <li><a href="#" id="logout-btn" style="color:var(--accent-red);"><span style="font-size:14px;">🚪</span> LOGOUT</a></li>
  </ul>

  <div class="nav-player-wrap">
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="nav-level-badge">LV<?= $player['level'] ?></span>
        <span style="font-size:8px;color:var(--gold);"><?= htmlspecialchars($player['name']) ?></span>
      </div>
      <div class="nav-xp-mini" style="margin-top:4px;"><?= $player['xp'] ?>/<?= $player['xp_next'] ?> XP</div>
      <div class="xp-bar-wrap" style="height:6px;margin-top:3px;width:120px;">
        <div class="xp-bar-fill" style="width:<?= $xpPct ?>%;"></div>
      </div>
    </div>
    <div style="font-family:'VT323';font-size:18px;color:var(--gold);">
      💰<?= number_format($gold) ?>G
    </div>
  </div>
</nav>
