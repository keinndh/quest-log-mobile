<?php
// includes/db.php
function getDB() {
    $db = new SQLite3(__DIR__ . '/../data/questlog.db');
    $db->exec('PRAGMA journal_mode=WAL;');
    $db->exec('PRAGMA foreign_keys=ON;');
    initDB($db);
    return $db;
}

function initDB($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS player (
        id INTEGER PRIMARY KEY,
        name TEXT DEFAULT 'Hero',
        class TEXT DEFAULT 'Warrior',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        xp_next INTEGER DEFAULT 100,
        avatar TEXT DEFAULT '⚔️',
        hp INTEGER DEFAULT 100,
        mp INTEGER DEFAULT 50,
        strength INTEGER DEFAULT 10,
        intelligence INTEGER DEFAULT 10,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'personal',
        priority TEXT DEFAULT 'normal',
        difficulty TEXT DEFAULT 'easy',
        xp_reward INTEGER DEFAULT 25,
        gold_reward INTEGER DEFAULT 10,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        start_date TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS achievements_unlocked (
        user_id INTEGER,
        achievement_id INTEGER,
        unlocked_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, achievement_id)
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        title TEXT,
        description TEXT,
        icon TEXT,
        category TEXT DEFAULT 'milestone',
        rarity TEXT DEFAULT 'common',
        xp_reward INTEGER DEFAULT 50,
        requirement_type TEXT,
        requirement_value INTEGER DEFAULT 1
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS daily_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        date TEXT,
        quests_completed INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS gold_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        amount INTEGER,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS player_gold (
        id INTEGER PRIMARY KEY,
        total INTEGER DEFAULT 0
    )");
    $db->exec("CREATE TABLE IF NOT EXISTS user_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        title TEXT NOT NULL,
        description TEXT,
        cost INTEGER DEFAULT 100,
        icon TEXT DEFAULT '🎁',
        redeemed_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )");

    // Migration: Add missing columns if they don't exist
    $cols = [];
    $res = $db->query("PRAGMA table_info(player)");
    while($row = $res->fetchArray(SQLITE3_ASSOC)) $cols[] = $row['name'];
    
    if(!in_array('name', $cols)) $db->exec("ALTER TABLE player ADD COLUMN name TEXT DEFAULT 'Hero'");
    if(!in_array('class', $cols)) $db->exec("ALTER TABLE player ADD COLUMN class TEXT DEFAULT 'Warrior'");
    if(!in_array('avatar', $cols)) $db->exec("ALTER TABLE player ADD COLUMN avatar TEXT DEFAULT '⚔️'");
    if(!in_array('class_locked', $cols)) $db->exec("ALTER TABLE player ADD COLUMN class_locked INTEGER DEFAULT 0");
    if(!in_array('weapon_rarity', $cols)) $db->exec("ALTER TABLE player ADD COLUMN weapon_rarity TEXT DEFAULT 'none'");
    
    $qCols = [];
    $res = $db->query("PRAGMA table_info(quests)");
    while($row = $res->fetchArray(SQLITE3_ASSOC)) $qCols[] = $row['name'];
    if(!in_array('user_id', $qCols)) $db->exec("ALTER TABLE quests ADD COLUMN user_id INTEGER DEFAULT 1");
    if(!in_array('is_paused', $qCols)) $db->exec("ALTER TABLE quests ADD COLUMN is_paused INTEGER DEFAULT 0");
    if(!in_array('last_penalty_date', $qCols)) $db->exec("ALTER TABLE quests ADD COLUMN last_penalty_date TEXT");
    if(!in_array('start_date', $qCols)) $db->exec("ALTER TABLE quests ADD COLUMN start_date TEXT");
    if(!in_array('due_date', $qCols)) $db->exec("ALTER TABLE quests ADD COLUMN due_date TEXT");

    // Seed player if empty
    $p = $db->querySingle("SELECT COUNT(*) FROM player");
    if ($p == 0) {
        $db->exec("INSERT INTO player (id, name, class, avatar) VALUES (1, 'Hero', 'Warrior', '⚔️')");
        $db->exec("INSERT INTO player_gold (id, total) VALUES (1, 0)");
    }

    // Seed default user if empty
    $u = $db->querySingle("SELECT COUNT(*) FROM users");
    if ($u == 0) {
        $db->exec("INSERT INTO users (username, password) VALUES ('Hero', 'quest')");
    }

    // Seed admin user if missing
    $adminExists = $db->querySingle("SELECT COUNT(*) FROM users WHERE username='admin'");
    if ($adminExists == 0) {
        $db->exec("INSERT INTO users (username, password) VALUES ('admin', 'adminmonengr28')");
        $adminId = $db->lastInsertRowID();
        // Check if player entry for this ID already exists (unlikely but safe)
        $pExists = $db->querySingle("SELECT COUNT(*) FROM player WHERE id=$adminId");
        if ($pExists == 0) {
            $db->exec("INSERT INTO player (id, name, class, avatar, level) VALUES ($adminId, 'Admin Master', 'Game Master', '👑', 999)");
            $db->exec("INSERT INTO player_gold (id, total) VALUES ($adminId, 999999)");
        }
    }

    // Seed achievements
    $ach = $db->querySingle("SELECT COUNT(*) FROM achievements");
    if ($ach == 0) {
        $achievements = [
            // Milestone
            ['first_quest', 'First Blood', 'Complete your first quest', '⚔️', 'milestone', 'common', 50, 'quests_total', 1],
            ['quest_5', 'Battle Hardened', 'Complete 5 quests', '🛡️', 'milestone', 'uncommon', 100, 'quests_total', 5],
            ['quest_10', 'Veteran Warrior', 'Complete 10 quests', '🏆', 'milestone', 'rare', 200, 'quests_total', 10],
            ['quest_25', 'Quest Master', 'Complete 25 quests', '👑', 'milestone', 'epic', 400, 'quests_total', 25],
            ['quest_50', 'Legendary Hero', 'Complete 50 quests', '🌟', 'milestone', 'legendary', 1000, 'quests_total', 50],
            ['quest_100', 'Mythic Champion', 'Complete 100 quests', '💎', 'milestone', 'mythic', 2500, 'quests_total', 100],
            // Category
            ['work_5', 'Office Knight', 'Complete 5 Work quests', '💼', 'category', 'uncommon', 100, 'cat_work', 5],
            ['health_5', 'Iron Body', 'Complete 5 Health quests', '💪', 'category', 'uncommon', 100, 'cat_health', 5],
            ['learning_5', 'Scholar', 'Complete 5 Learning quests', '📚', 'category', 'uncommon', 100, 'cat_learning', 5],
            ['personal_5', 'Self Master', 'Complete 5 Personal quests', '🧘', 'category', 'uncommon', 100, 'cat_personal', 5],
            ['finance_5', 'Gold Hoarder', 'Complete 5 Finance quests', '💰', 'category', 'uncommon', 100, 'cat_finance', 5],
            ['social_5', 'People Champion', 'Complete 5 Social quests', '🤝', 'category', 'uncommon', 100, 'cat_social', 5],
            // Special
            ['level_5', 'Rank Up', 'Reach Level 5', '⭐', 'special', 'rare', 300, 'level', 5],
            ['level_10', 'Legendary Rank', 'Reach Level 10', '🌠', 'special', 'epic', 750, 'level', 10],
            ['streak_3', 'On Fire', '3 day completion streak', '🔥', 'special', 'rare', 200, 'streak', 3],
            ['streak_7', 'Unstoppable', '7 day streak', '⚡', 'special', 'epic', 500, 'streak', 7],
            ['hard_quest', 'Challenge Seeker', 'Complete a Hard quest', '💀', 'special', 'rare', 150, 'hard_quest', 1],
            ['all_cats', 'Polymath', 'Complete quest in all 6 categories', '🔮', 'special', 'legendary', 800, 'all_cats', 6],
        ];
        $stmt = $db->prepare("INSERT INTO achievements (key, title, description, icon, category, rarity, xp_reward, requirement_type, requirement_value) VALUES (?,?,?,?,?,?,?,?,?)");
        foreach ($achievements as $a) {
            $stmt->reset();
            for ($i = 0; $i < 9; $i++) $stmt->bindValue($i+1, $a[$i]);
            $stmt->execute();
        }
    }
}

function getPlayer($db, $userId = null) {
    if (!$userId && isset($_SESSION['user_id'])) $userId = $_SESSION['user_id'];
    if (!$userId) $userId = 1; // Fallback to default hero
    return $db->querySingle("SELECT * FROM player WHERE id=$userId", true);
}

function getGold($db, $userId = null) {
    if (!$userId && isset($_SESSION['user_id'])) $userId = $_SESSION['user_id'];
    if (!$userId) $userId = 1;
    return $db->querySingle("SELECT total FROM player_gold WHERE id=$userId") ?? 0;
}

function addXP($db, $amount, $userId = null) {
    if (!$userId && isset($_SESSION['user_id'])) $userId = $_SESSION['user_id'];
    if (!$userId) $userId = 1;
    
    $player = getPlayer($db, $userId);
    $newXP = $player['xp'] + $amount;
    $level = $player['level'];
    $xpNext = $player['xp_next'];
    $leveledUp = false;
    while ($newXP >= $xpNext) {
        $newXP -= $xpNext;
        $level++;
        $xpNext = intval($xpNext * 1.4);
        $leveledUp = true;
    }
    $db->exec("UPDATE player SET xp=$newXP, level=$level, xp_next=$xpNext WHERE id=$userId");
    return ['leveled_up' => $leveledUp, 'new_level' => $level];
}

function checkAchievements($db, $userId = null) {
    if (!$userId && isset($_SESSION['user_id'])) $userId = $_SESSION['user_id'];
    if (!$userId) $userId = 1;

    $newUnlocks = [];
    $total = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
    $level = $db->querySingle("SELECT level FROM player WHERE id=$userId");
    $cats = $db->query("SELECT category, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=$userId GROUP BY category");
    $catCounts = [];
    while ($row = $cats->fetchArray(SQLITE3_ASSOC)) $catCounts[$row['category']] = $row['cnt'];
    $hardDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND difficulty='hard' AND user_id=$userId");
    
    // Get achievements NOT unlocked by this user
    $allAch = $db->query("SELECT * FROM achievements WHERE id NOT IN (SELECT achievement_id FROM achievements_unlocked WHERE user_id=$userId)");
    while ($ach = $allAch->fetchArray(SQLITE3_ASSOC)) {
        $unlock = false;
        switch ($ach['requirement_type']) {
            case 'quests_total': $unlock = $total >= $ach['requirement_value']; break;
            case 'cat_work': $unlock = ($catCounts['work'] ?? 0) >= $ach['requirement_value']; break;
            case 'cat_health': $unlock = ($catCounts['health'] ?? 0) >= $ach['requirement_value']; break;
            case 'cat_learning': $unlock = ($catCounts['learning'] ?? 0) >= $ach['requirement_value']; break;
            case 'cat_personal': $unlock = ($catCounts['personal'] ?? 0) >= $ach['requirement_value']; break;
            case 'cat_finance': $unlock = ($catCounts['finance'] ?? 0) >= $ach['requirement_value']; break;
            case 'cat_social': $unlock = ($catCounts['social'] ?? 0) >= $ach['requirement_value']; break;
            case 'level': $unlock = $level >= $ach['requirement_value']; break;
            case 'hard_quest': $unlock = $hardDone >= 1; break;
            case 'all_cats': $unlock = count($catCounts) >= 6; break;
        }
        if ($unlock) {
            $stmt = $db->prepare("INSERT INTO achievements_unlocked (user_id, achievement_id) VALUES (?, ?)");
            $stmt->bindValue(1, $userId);
            $stmt->bindValue(2, $ach['id']);
            $stmt->execute();
            
            addXP($db, $ach['xp_reward'], $userId);
            $newUnlocks[] = $ach;
        }
    }
    return $newUnlocks;
}

function rarityClass($rarity) {
    return match($rarity) {
        'uncommon' => 'badge-green',
        'rare' => 'badge-cyan',
        'epic' => 'badge-purple',
        'legendary' => 'badge-orange',
        'mythic' => 'badge-red',
        default => 'badge-gold'
    };
}
