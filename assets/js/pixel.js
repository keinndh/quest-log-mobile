// QUEST LOG — Global Pixel JS
// Retro sound effects via Web Audio API

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playTone(freq, type, dur, vol = 0.15) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  } catch(e) {}
}

function playChime() {
  // Victory / quest complete chime
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 'square', 0.18, 0.12), i * 80)
  );
}

function playClick() {
  playTone(440, 'square', 0.05, 0.08);
}

function playError() {
  [220, 180].forEach((f, i) =>
    setTimeout(() => playTone(f, 'sawtooth', 0.12, 0.1), i * 100)
  );
}

function playLevelUp() {
  [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
    setTimeout(() => playTone(f, 'square', 0.25, 0.14), i * 70)
  );
}

function playCoin() {
  [880, 1108].forEach((f, i) =>
    setTimeout(() => playTone(f, 'sine', 0.1, 0.1), i * 60)
  );
}

// Global Sound Exports
window.playChime = playChime;
window.playClick = playClick;
window.playError = playError;
window.playLevelUp = playLevelUp;
window.playCoin = playCoin;

// Global Click Sound
$(document).on("click", "button, .btn-pixel, .sidebar-links a, .nav-logo", function() {
    playClick();
});

// Auth Check (Immediate Redirect)
(function() {
  const path = window.location.pathname;
  const isAuthPage = path.endsWith('index.html') || path.endsWith('register.html');
  const userId = localStorage.getItem('ql_user_id');
  
  // Detect if we are in the root or /pages/ folder
  const isRoot = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  const loginPath = isRoot ? 'index.html' : 'index.html';

  if (!isAuthPage && !userId) {
    window.location.href = loginPath;
  }
})();

// Attach click sounds to all pixel buttons
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const isRoot = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
  const loginPath = isRoot ? 'index.html' : 'index.html';

  // Initialize Sidebar
  injectSidebar();
  
  // Mobile Menu Toggle (Sidebar)
  $(document).on("click", "#menu-toggle", function(e) {
    e.stopPropagation();
    $(".sidebar-pixel").addClass("open");
    $(".sidebar-overlay").addClass("show");
  });

  $(document).on("click", ".sidebar-overlay, #sidebar-close", function() {
    $(".sidebar-pixel").removeClass("open");
    $(".sidebar-overlay").removeClass("show");
  });

  // Logout Handler
  $(document).on("click", "#logout-btn", function(e) {
    e.preventDefault();
    if (confirm("⚔️ Are you sure you wish to retreat to the login screen, Hero?")) {
        localStorage.removeItem('ql_user_id');
        window.location.href = loginPath;
    }
  });

  // Splash Screen Handler (Faster & Non-Blocking)
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
    }, 800); // Only 0.8s total
  }

  // Mobile Menu Toggle
  $(document).on("click", "#menu-toggle", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $("#nav-menu").toggleClass("open");
    $(this).text($("#nav-menu").hasClass("open") ? "✕" : "☰");
  });

  // Close menu when clicking a link (for SPA feel) or outside
  $(document).on("click", ".nav-links a", function() {
    $("#nav-menu").removeClass("open");
    $("#menu-toggle").text("☰");
  });

  $(document).on("click", function(e) {
    if (!$(e.target).closest('.nav-pixel').length) {
      $("#nav-menu").removeClass("open");
      $("#menu-toggle").text("☰");
    }
  });

  document.querySelectorAll('.btn-pixel').forEach(btn => {
    btn.addEventListener('click', () => playClick());
  });

  document.querySelectorAll('.quest-checkbox').forEach(cb => {
    cb.addEventListener('click', () => playChime());
  });

  // Animate stat bars on load
  document.querySelectorAll('.stat-fill, .xp-bar-fill').forEach(el => {
    const targetW = el.style.width;
    if (targetW && targetW !== '0%') {
      el.style.width = '0%';
      setTimeout(() => { el.style.width = targetW; }, 200);
    }
  });

  // Pixel cursor trail
  const trail = [];
  const TRAIL_LENGTH = 6;
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed; pointer-events:none; z-index:99999;
      width:${6 - i}px; height:${6 - i}px;
      background: hsl(${40 + i*15}, 100%, ${60 + i*5}%);
      opacity:${1 - i/TRAIL_LENGTH};
      image-rendering:pixelated;
      transition: left 0.05s steps(1), top 0.05s steps(1);
    `;
    document.body.appendChild(dot);
    trail.push(dot);
  }

  let mouseX = 0, mouseY = 0;
  const positions = Array(TRAIL_LENGTH).fill({ x: 0, y: 0 });

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function updateTrail() {
    positions.unshift({ x: mouseX, y: mouseY });
    positions.length = TRAIL_LENGTH;
    trail.forEach((dot, i) => {
      const p = positions[i] || positions[0];
      dot.style.left = (p.x - 3) + 'px';
      dot.style.top  = (p.y - 3) + 'px';
    });
    requestAnimationFrame(updateTrail);
  }
  updateTrail();

  // Achievement toast with sound
  const origShow = window.showToast;
  window.showToast = function(icon, title, desc) {
    playChime();
    if (origShow) origShow(icon, title, desc);
  };

  // Floating XP numbers on quest complete
  document.querySelectorAll('form [name="action"][value="complete"]').forEach(inp => {
    inp.closest('form').addEventListener('submit', function(e) {
      playChime();
      const rect = this.getBoundingClientRect();
      spawnFloatText('+XP', rect.left + rect.width/2, rect.top);
    });
  });

  function spawnFloatText(text, x, y) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:fixed; left:${x}px; top:${y}px;
      font-family:'Press Start 2P',monospace; font-size:12px;
      color:#FFD700; pointer-events:none; z-index:99999;
      text-shadow:2px 2px 0 #000;
      animation: floatXP 1.2s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // Inject float animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatXP {
      0%   { transform:translateY(0) scale(1); opacity:1; }
      100% { transform:translateY(-60px) scale(1.4); opacity:0; }
    }
  `;
  document.head.appendChild(style);
});

function injectSidebar() {
    if ($(".sidebar-pixel").length > 0) return;

    const path = window.location.pathname;
    // Determine if we are in the root directory (looking for index.html or the base /)
    const isDashboard = path.includes('dashboard');
    
    // Paths to navigate correctly between root and pages/
    const toRoot = '';
    const toPages = '';

    const sidebarHtml = `
        <div class="sidebar-overlay"></div>
        <aside class="sidebar-pixel">
            <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 20px; padding: 10px;">
                <div class="nav-logo">
                    <span style="font-size:24px;">⚔️</span>
                    <span>QUEST LOG</span>
                </div>
            </div>
            <ul class="sidebar-links">
                <li><a href="${toRoot}dashboard.html" class="${isDashboard ? 'active' : ''}">🏰 KINGDOM</a></li>
                <li><a href="${toPages}quests.html" class="${path.includes('quests') ? 'active' : ''}">📜 QUESTS</a></li>
                <li><a href="${toPages}character.html" class="${path.includes('character') ? 'active' : ''}">⚔️ CHARACTER</a></li>
                <li><a href="${toPages}achievements.html" class="${path.includes('achievements') ? 'active' : ''}">🏆 ACHIEVEMENTS</a></li>
                <li><a href="${toPages}shop.html" class="${path.includes('shop') ? 'active' : ''}">🛒 SHOP</a></li>
                <li><a href="${toPages}user_rewards.html" class="${path.includes('user_rewards') ? 'active' : ''}">🎁 REWARDS</a></li>
                <li><a href="${toPages}stats.html" class="${path.includes('stats') ? 'active' : ''}">📊 STATS</a></li>
                <li><a href="${toPages}leaderboard.html" class="${path.includes('leaderboard') ? 'active' : ''}">👑 RANKS</a></li>
                <li><a href="${toPages}daily-log.html" class="${path.includes('daily-log') ? 'active' : ''}">📅 LOG</a></li>
                <li><a href="${toPages}settings.html" class="${path.includes('settings') ? 'active' : ''}">⚙️ SETTINGS</a></li>
                <li style="margin-top: auto; padding-top: 20px; border-top: 2px solid rgba(255,215,0,0.1);">
                    <a id="logout-btn" style="color: var(--accent-red); cursor: pointer;">🚪 LOGOUT</a>
                </li>
            </ul>
        </aside>
    `;
    $("body").append(sidebarHtml);
}

// Browser Notifications
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}
window.requestNotificationPermission = requestNotificationPermission;

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: window.location.pathname.includes('/pages/') ? '../assets/img/icon-192.png' : 'assets/img/icon-192.png'
        });
    }
}
window.showNotification = showNotification;

function checkOverdueQuests() {
    const quests = window.db.getQuests();
    const now = new Date();
    const overdue = quests.filter(q => {
        if (q.completed || !q.due_date) return false;
        return new Date(q.due_date) < now;
    });

    if (overdue.length > 0) {
        const msg = `You have ${overdue.length} overdue quests! Glory awaits, don't delay!`;
        showNotification("📜 QUEST LOG REMINDER", msg);
    }
}

// Initialize Global Handlers
$(document).ready(function() {
    // Request notification permission silently
    setTimeout(requestNotificationPermission, 2000);
    
    // Check for overdue quests after a short delay
    setTimeout(checkOverdueQuests, 5000);
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = window.location.pathname.includes('/pages/') ? '../sw.js' : 'sw.js';
    navigator.serviceWorker.register(swPath)
      .then(reg => console.log('[PWA] Service Worker registered!', reg))
      .catch(err => console.log('[PWA] Service Worker registration failed!', err));
  });
}

// Smooth Page Transitions
$(document).on("click", "a", function(e) {
    const href = $(this).attr("href");
    
    // Ignore external links, anchors, and target="_blank"
    if (!href || href.startsWith("http") || href.startsWith("#") || $(this).attr("target") === "_blank" || href.startsWith("javascript:")) {
        return;
    }
    
    e.preventDefault();
    $("body").addClass("page-fade-out");
    
    setTimeout(() => {
        window.location.href = href;
    }, 250);
});



