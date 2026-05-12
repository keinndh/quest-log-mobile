<?php
session_start();

// Generate CSRF token if not exists
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Basic Router
$page = $_GET['page'] ?? 'dashboard';

// Auth Protection
$publicPages = ['login', 'register'];
if (!isset($_SESSION['user_id']) && !in_array($page, $publicPages)) {
    header("Location: ?page=login");
    exit;
}

// Redirect if already logged in and trying to access login/register
if (isset($_SESSION['user_id']) && in_array($page, $publicPages)) {
    header("Location: ?page=dashboard");
    exit;
}

// Map page names to view files
$viewFile = match($page) {
    'login' => 'login.php',
    'register' => 'login.php',
    'dashboard' => 'dashboard.php',
    'quests' => 'quests.php',
    'character' => 'character.php',
    'achievements' => 'achievements.php',
    'shop' => 'shop.php',
    'stats' => 'stats.php',
    'leaderboard' => 'leaderboard.php',
    'daily-log' => 'daily_log.php',
    'settings' => 'settings.php',
    'rewards' => 'rewards.php',
    default => '404.php'
};

$viewPath = __DIR__ . '/../views/' . $viewFile;

if (file_exists($viewPath)) {
    require_once $viewPath;
} else {
    echo "<h1>404 - Adventure Not Found</h1><p>The path you seek does not exist in this Kingdom.</p>";
}
