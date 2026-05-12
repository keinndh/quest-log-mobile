<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/db.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        die(json_encode(['status' => 'error', 'message' => 'CSRF token mismatch. Security breach detected!']));
    }
}

if(isset($_POST['action'])) {
    $action = $_POST['action'];

    switch($action) {
        case 'login':
            $ip = $_SERVER['REMOTE_ADDR'];
            $now = time();
            
            // Rate limit check: 10 attempts per 15 minutes
            $stmt = $db->prepare("SELECT attempts, last_attempt FROM login_attempts WHERE ip = ?");
            $stmt->bindValue(1, $ip);
            $res = $stmt->execute();
            $attemptRow = $res->fetchArray(SQLITE3_ASSOC);
            
            if ($attemptRow) {
                if ($now - $attemptRow['last_attempt'] < 900) { // 15 mins
                    if ($attemptRow['attempts'] >= 10) {
                        echo json_encode(['status' => 'error', 'message' => 'Too many failed attempts. Try again in 15 minutes.']);
                        break;
                    }
                } else {
                    // Reset if last attempt was > 15 mins ago
                    $db->exec("DELETE FROM login_attempts WHERE ip = '$ip'");
                }
            }

            $user = trim($_POST['username'] ?? '');
            $pass = $_POST['password'] ?? '';
            
            $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->bindValue(1, $user);
            $res = $stmt->execute();
            $row = $res->fetchArray(SQLITE3_ASSOC);
            
            if($row && password_verify($pass, $row['password'])) {
                // Success - clear attempts
                $stmt = $db->prepare("DELETE FROM login_attempts WHERE ip = ?");
                $stmt->bindValue(1, $ip);
                $stmt->execute();
                
                $_SESSION['user_id'] = $row['id'];
                $_SESSION['username'] = $row['username'];
                echo json_encode(['status' => 'success']);
            } else {
                // Failed - increment attempts
                $stmt = $db->prepare("INSERT INTO login_attempts (ip, attempts, last_attempt) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET attempts = attempts + 1, last_attempt = excluded.last_attempt");
                $stmt->bindValue(1, $ip);
                $stmt->bindValue(2, $now);
                $stmt->execute();
                
                echo json_encode(['status' => 'error', 'message' => 'Invalid username or password']);
            }
            break;
            
        case 'register':
            $user = trim($_POST['username'] ?? '');
            $pass = $_POST['password'] ?? '';
            
            if(!$user || strlen($pass) < 8) {
                echo json_encode(['status' => 'error', 'message' => 'Username required and password must be at least 8 characters!']);
                break;
            }
            
            // Check if user exists
            $check = $db->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $check->bindValue(1, $user);
            $cRes = $check->execute();
            if($cRes->fetchArray()[0] > 0) {
                echo json_encode(['status' => 'error', 'message' => 'Username already taken']);
                break;
            }
            
            $hashed = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $db->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            $stmt->bindValue(1, $user);
            $stmt->bindValue(2, $hashed);
            
            if($stmt->execute()) {
                $newId = $db->lastInsertRowID();
                // Initialize player data
                $pStmt = $db->prepare("INSERT INTO player (id, name) VALUES (?, ?)");
                $pStmt->bindValue(1, $newId);
                $pStmt->bindValue(2, $user);
                $pStmt->execute();
                
                $gStmt = $db->prepare("INSERT INTO player_gold (id, total) VALUES (?, 0)");
                $gStmt->bindValue(1, $newId);
                $gStmt->execute();
                
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to register']);
            }
            break;
            
        case 'logout':
            if (isset($_SESSION['user_id'])) {
                session_destroy();
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No active session found']);
            }
            break;
            
        case 'checkAuth':
            if(isset($_SESSION['user_id'])) {
                echo json_encode(['status' => 'success', 'username' => $_SESSION['username']]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
            }
            break;
        case 'getDashboardData':
            $userId = $_SESSION['user_id'] ?? 1;
            
            // Apply penalties before loading data
            applyQuestPenalties($db, $userId);

            $player = getPlayer($db, $userId);
            $gold = getGold($db, $userId);
            
            $totalCompleted = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=" . (int)$userId);
            $totalPending = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=0 AND user_id=" . (int)$userId);
            $todayCompleted = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)=date('now') AND user_id=" . (int)$userId);
            
            $achTotal = $db->querySingle("SELECT COUNT(*) FROM achievements");
            $achUnlocked = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=" . (int)$userId);
            
            $recentQuests = [];
            $rqStmt = $db->prepare("SELECT * FROM quests WHERE user_id=? ORDER BY created_at DESC LIMIT 5");
            $rqStmt->bindValue(1, $userId);
            $rqRes = $rqStmt->execute();
            while ($q = $rqRes->fetchArray(SQLITE3_ASSOC)) {
                $recentQuests[] = $q;
            }
 
            $recentAch = [];
            $raStmt = $db->prepare("SELECT a.*, au.unlocked_at FROM achievements a JOIN achievements_unlocked au ON a.id = au.achievement_id WHERE au.user_id=? ORDER BY au.unlocked_at DESC LIMIT 3");
            $raStmt->bindValue(1, $userId);
            $raRes = $raStmt->execute();
            while ($a = $raRes->fetchArray(SQLITE3_ASSOC)) {
                $a['unlocked'] = 1;
                $recentAch[] = $a;
            }
 
            $catData = [];
            $catStmt = $db->prepare("SELECT category, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=? GROUP BY category ORDER BY cnt DESC");
            $catStmt->bindValue(1, $userId);
            $catRes = $catStmt->execute();
            while ($row = $catRes->fetchArray(SQLITE3_ASSOC)) {
                $catData[] = $row;
            }
 
            echo json_encode([
                'status' => 'success',
                'player' => $player,
                'gold' => $gold,
                'stats' => [
                    'totalCompleted' => $totalCompleted,
                    'totalPending' => $totalPending,
                    'todayCompleted' => $todayCompleted,
                    'achTotal' => $achTotal,
                    'achUnlocked' => $achUnlocked
                ],
                'recentQuests' => $recentQuests,
                'recentAch' => $recentAch,
                'categories' => $catData
            ]);
            break;
            
        case 'getQuests':
            $userId = $_SESSION['user_id'] ?? 1;
            
            // Apply penalties before loading list
            applyQuestPenalties($db, $userId);

            $filter = $_POST['filter'] ?? 'active';
            $category = $_POST['category'] ?? 'all';
            $sort = $_POST['sort'] ?? 'newest';
            $search = trim($_POST['search'] ?? '');
 
            $query = "SELECT * FROM quests WHERE user_id = ?";
            $params = [$userId];
            
            if ($filter === 'active') $query .= ' AND completed=0';
            if ($filter === 'completed') $query .= ' AND completed=1';
            
            if ($category !== 'all') {
                $query .= " AND category = ?";
                $params[] = $category;
            }
            if ($search) {
                $query .= " AND (title LIKE ? OR description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            $orderBy = match($sort) {
                'xp' => 'xp_reward DESC', 
                'priority' => "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END",
                'oldest' => 'created_at ASC', 
                default => 'created_at DESC'
            };
            $query .= " ORDER BY $orderBy";
  
            $quests = [];
            $stmt = $db->prepare($query);
            foreach ($params as $idx => $val) {
                $stmt->bindValue($idx + 1, $val);
            }
            $qRes = $stmt->execute();
            while($q = $qRes->fetchArray(SQLITE3_ASSOC)) {
                $quests[] = $q;
            }
            echo json_encode(['status' => 'success', 'data' => $quests]);
            break;

        case 'addQuest':
            try {
                $userId = $_SESSION['user_id'] ?? 1;
                $title = trim($_POST['title'] ?? '');
                if($title) {
                    $desc = trim($_POST['description'] ?? '');
                    $cat = $_POST['category'] ?? 'personal';
                    $prio = $_POST['priority'] ?? 'normal';
                    $diff = $_POST['difficulty'] ?? 'easy';
                    $startDate = $_POST['start_date'] ?? null;
                    $dueDate = $_POST['due_date'] ?? null;
                    
                    $xpMap = ['easy' => 25, 'medium' => 50, 'hard' => 100, 'legendary' => 250];
                    $goldMap = ['easy' => 10, 'medium' => 25, 'hard' => 50, 'legendary' => 150];
                    $xp = $xpMap[$diff] ?? 25;
                    $gold = $goldMap[$diff] ?? 10;
                    
                    $stmt = $db->prepare("INSERT INTO quests (user_id, title, description, category, priority, difficulty, xp_reward, gold_reward, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bindValue(1, $userId);
                    $stmt->bindValue(2, $title);
                    $stmt->bindValue(3, $desc);
                    $stmt->bindValue(4, $cat);
                    $stmt->bindValue(5, $prio);
                    $stmt->bindValue(6, $diff);
                    $stmt->bindValue(7, $xp);
                    $stmt->bindValue(8, $gold);
                    $stmt->bindValue(9, $startDate);
                    $stmt->bindValue(10, $dueDate);
                    
                    if($stmt->execute()) {
                        echo json_encode(['status' => 'success']);
                    } else {
                        echo json_encode(['status' => 'error', 'message' => 'Database execution failed']);
                    }
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Quest title is required!']);
                }
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
            break;

        case 'getQuest':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $stmt = $db->prepare("SELECT * FROM quests WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $id);
                $stmt->bindValue(2, $userId);
                $res = $stmt->execute();
                $q = $res->fetchArray(SQLITE3_ASSOC);
                if($q) {
                    echo json_encode(['status' => 'success', 'data' => $q]);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Quest not found']);
                }
            }
            break;

        case 'editQuest':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            $title = trim($_POST['title'] ?? '');
            if($id && $title) {
                $desc = trim($_POST['description'] ?? '');
                $cat = $_POST['category'] ?? 'personal';
                $prio = $_POST['priority'] ?? 'normal';
                $diff = $_POST['difficulty'] ?? 'easy';
                $startDate = $_POST['start_date'] ?? null;
                $dueDate = $_POST['due_date'] ?? null;
                
                $xpMap = ['easy' => 25, 'medium' => 50, 'hard' => 100, 'legendary' => 250];
                $goldMap = ['easy' => 10, 'medium' => 25, 'hard' => 50, 'legendary' => 150];
                $xp = $xpMap[$diff] ?? 25;
                $gold = $goldMap[$diff] ?? 10;
                
                $stmt = $db->prepare("UPDATE quests SET title=?, description=?, category=?, priority=?, difficulty=?, xp_reward=?, gold_reward=?, start_date=?, due_date=? WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $title);
                $stmt->bindValue(2, $desc);
                $stmt->bindValue(3, $cat);
                $stmt->bindValue(4, $prio);
                $stmt->bindValue(5, $diff);
                $stmt->bindValue(6, $xp);
                $stmt->bindValue(7, $gold);
                $stmt->bindValue(8, $startDate);
                $stmt->bindValue(9, $dueDate);
                $stmt->bindValue(10, $id);
                $stmt->bindValue(11, $userId);
                
                if($stmt->execute()) {
                    echo json_encode(['status' => 'success']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Failed to update quest']);
                }
            } else {
                echo json_encode(['status' => 'error', 'message' => 'ID and Title required']);
            }
            break;
            
        case 'deleteQuest':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $stmt = $db->prepare("DELETE FROM quests WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $id);
                $stmt->bindValue(2, $userId);
                if($stmt->execute()) {
                    echo json_encode(['status' => 'success']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Failed to delete']);
                }
            }
            break;

        case 'completeQuest':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $player = getPlayer($db, $userId);
                $stmt = $db->prepare("SELECT title, xp_reward, gold_reward FROM quests WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $id);
                $stmt->bindValue(2, $userId);
                $res = $stmt->execute();
                $q = $res->fetchArray(SQLITE3_ASSOC);

                if($q) {
                    $bonusGold = 0;
                    $weaponRarity = $player['weapon_rarity'] ?? 'none';
                    $bonusGold = match($weaponRarity) {
                        'uncommon' => 1,
                        'rare' => 5,
                        'epic' => 10,
                        'legendary' => 15,
                        'mythic' => 25,
                        'divine' => 50,
                        default => 0
                    };
                    $totalGold = $q['gold_reward'] + $bonusGold;
                    
                    $u1 = $db->prepare("UPDATE quests SET completed=1, completed_at=datetime('now') WHERE id=? AND user_id=?");
                    $u1->bindValue(1, $id);
                    $u1->bindValue(2, $userId);
                    $u1->execute();

                    $u2 = $db->prepare("UPDATE player_gold SET total = total + ? WHERE id=?");
                    $u2->bindValue(1, $totalGold);
                    $u2->bindValue(2, $userId);
                    $u2->execute();
                    
                    // Log the gain
                    $stmtLog = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
                    $stmtLog->bindValue(1, $userId);
                    $stmtLog->bindValue(2, $totalGold);
                    $stmtLog->bindValue(3, "Quest Completed: \"{$q['title']}\" (Bonus: +{$bonusGold}G)");
                    $stmtLog->execute();
                    
                    addXP($db, $q['xp_reward'], $userId);
                    $newUnlocks = checkAchievements($db, $userId);
                    
                    echo json_encode(['status' => 'success', 'xp_earned' => $q['xp_reward'], 'gold_earned' => $totalGold, 'new_achievements' => $newUnlocks]);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Quest not found']);
                }
            }
            break;
            
        case 'getCharacterData':
            $userId = $_SESSION['user_id'] ?? 1;
            $player = getPlayer($db, $userId);
            
            $stmt = $db->prepare("SELECT username FROM users WHERE id=?");
            $stmt->bindValue(1, $userId);
            $res = $stmt->execute();
            $user = $res->fetchArray(SQLITE3_ASSOC);
            
            $player['username'] = $user['username'] ?? '';
            $player['is_admin'] = ($player['username'] === 'admin');
            
            $gold = getGold($db, $userId);
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=" . (int)$userId);
            
            $str = min(99, 10 + $player['level'] * 3 + $totalDone);
            $intel = min(99, 10 + $player['level'] * 2);
            $hp = min(999, 100 + $player['level'] * 10);
            $mp = min(999, 50 + $player['level'] * 5);
            
            $recentAch = [];
            $achStmt = $db->prepare("SELECT a.*, au.unlocked_at FROM achievements a JOIN achievements_unlocked au ON a.id = au.achievement_id WHERE au.user_id=? ORDER BY au.unlocked_at DESC LIMIT 6");
            $achStmt->bindValue(1, $userId);
            $achRes = $achStmt->execute();
            while ($a = $achRes->fetchArray(SQLITE3_ASSOC)) {
                $a['unlocked'] = 1;
                $recentAch[] = $a;
            }

            echo json_encode([
                'status' => 'success',
                'player' => $player,
                'gold' => $gold,
                'totalDone' => $totalDone,
                'stats' => ['str' => $str, 'intel' => $intel, 'hp' => $hp, 'mp' => $mp],
                'recentAchievements' => $recentAch
            ]);
            break;

        case 'updateProfile':
            $userId = $_SESSION['user_id'] ?? 1;
            $name = trim($_POST['name'] ?? 'Hero');
            $class = $_POST['class'] ?? 'Warrior';
            $avatar = $_POST['avatar'] ?? '⚔️';
            
            // Get current state
            $cStmt = $db->prepare("SELECT class, class_locked FROM player WHERE id = ?");
            $cStmt->bindValue(1, $userId);
            $current = $cStmt->execute()->fetchArray(SQLITE3_ASSOC);
            
            $uStmt = $db->prepare("SELECT username FROM users WHERE id=?");
            $uStmt->bindValue(1, $userId);
            $user = $uStmt->execute()->fetchArray(SQLITE3_ASSOC);
            $isAdmin = ($user['username'] === 'admin');

            if (!$isAdmin && $class !== $current['class'] && $current['class_locked'] == 1) {
                $totalAch = $db->querySingle("SELECT COUNT(*) FROM achievements");
                $unlockedAch = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id = " . (int)$userId);
                
                if ($unlockedAch < $totalAch) {
                    echo json_encode(['status' => 'error', 'message' => 'CLASS LOCKED! Earn all achievements to change class again.']);
                    break;
                }
            }

            // Check if username already exists for another user
            $exStmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $exStmt->bindValue(1, $name);
            $exStmt->bindValue(2, $userId);
            if ($exStmt->execute()->fetchArray()) {
                echo json_encode(['status' => 'error', 'message' => 'Username already taken']);
                break;
            }

            // Update player table
            $stmt = $db->prepare("UPDATE player SET name=?, class=?, avatar=?, class_locked=1 WHERE id=?");
            $stmt->bindValue(1, $name);
            $stmt->bindValue(2, $class);
            $stmt->bindValue(3, $avatar);
            $stmt->bindValue(4, $userId);
            $stmt->execute();

            // Update users table
            $stmt2 = $db->prepare("UPDATE users SET username=? WHERE id=?");
            $stmt2->bindValue(1, $name);
            $stmt2->bindValue(2, $userId);
            
            if($stmt2->execute()) {
                $_SESSION['username'] = $name; // Sync session
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update credentials']);
            }
            break;

        case 'updatePassword':
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) {
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                break;
            }
            
            $current = $_POST['current'] ?? '';
            $new = $_POST['password'] ?? '';
            
            // Verify current
            $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
            $stmt->bindValue(1, $userId);
            $res = $stmt->execute();
            $user = $res->fetchArray(SQLITE3_ASSOC);

            if (!$user || !password_verify($current, $user['password'])) {
                echo json_encode(['status' => 'error', 'message' => 'Current password incorrect']);
                break;
            }

            if (strlen($new) < 8) {
                echo json_encode(['status' => 'error', 'message' => 'New password must be at least 8 characters']);
                break;
            }
            
            $hashed = password_hash($new, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->bindValue(1, $hashed);
            $stmt->bindValue(2, $userId);
            
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Credential successfully updated!']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Update failed']);
            }
            break;

        case 'deleteAccount':
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) {
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                break;
            }

            // Delete all user data using prepared statements for safety
            $tables = ['users', 'player', 'player_gold', 'quests', 'daily_log', 'gold_log', 'achievements_unlocked'];
            foreach ($tables as $table) {
                $column = ($table === 'quests' || $table === 'daily_log' || $table === 'gold_log' || $table === 'achievements_unlocked') ? 'user_id' : 'id';
                $stmt = $db->prepare("DELETE FROM $table WHERE $column = ?");
                $stmt->bindValue(1, $userId);
                $stmt->execute();
            }

            session_destroy();
            echo json_encode(['status' => 'success', 'message' => 'Account deleted. Farewell, Hero.']);
            break;

        case 'togglePause':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'];
            $stmt = $db->prepare("SELECT is_paused FROM quests WHERE id=? AND user_id=?");
            $stmt->bindValue(1, $id);
            $stmt->bindValue(2, $userId);
            $res = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
            if ($res) {
                $newVal = $res['is_paused'] ? 0 : 1;
                $uStmt = $db->prepare("UPDATE quests SET is_paused = ? WHERE id=?");
                $uStmt->bindValue(1, $newVal);
                $uStmt->bindValue(2, $id);
                $uStmt->execute();
                echo json_encode(['status' => 'success', 'is_paused' => $newVal]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Quest not found']);
            }
            break;

        case 'updateDelay':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'];
            $dueDate = $_POST['due_date'];
            
            $stmt = $db->prepare("UPDATE quests SET due_date = ?, is_paused = 1, last_penalty_date = ? WHERE id = ? AND user_id = ?");
            $stmt->bindValue(1, $dueDate);
            $stmt->bindValue(2, date('Y-m-d')); // Reset penalty clock to today
            $stmt->bindValue(3, $id);
            $stmt->bindValue(4, $userId);
            
            if($stmt->execute()) {
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update delay']);
            }
            break;

        case 'getAchievementsData':
            $userId = $_SESSION['user_id'] ?? 1;
            $filter = $_POST['filter'] ?? 'all';
            
            $sql = "SELECT a.*, CASE WHEN au.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked, au.unlocked_at FROM achievements a LEFT JOIN achievements_unlocked au ON a.id = au.achievement_id AND au.user_id = ?";
            
            if ($filter === 'unlocked') {
                $sql .= " WHERE au.user_id IS NOT NULL";
            } elseif ($filter === 'locked') {
                $sql .= " WHERE au.user_id IS NULL";
            }
            
            $sql .= " ORDER BY unlocked DESC, rarity DESC, a.id ASC";
            
            $stmt = $db->prepare($sql);
            $stmt->bindValue(1, $userId);
            $achs = $stmt->execute();
            $achArr = [];
            while ($a = $achs->fetchArray(SQLITE3_ASSOC)) {
                $achArr[] = $a;
            }
            
            $rarityOrder = ['mythic'=>0,'legendary'=>1,'epic'=>2,'rare'=>3,'uncommon'=>4,'common'=>5];
            usort($achArr, function($a, $b) use ($rarityOrder) {
                if ($a['unlocked'] == $b['unlocked']) {
                    return $rarityOrder[$a['rarity']] <=> $rarityOrder[$b['rarity']];
                }
                return $b['unlocked'] <=> $a['unlocked'];
            });

            $total = $db->querySingle("SELECT COUNT(*) FROM achievements");
            $unlocked = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$userId");
            
            $rarityCounts = [];
            $rarities = ['common','uncommon','rare','epic','legendary','mythic'];
            foreach ($rarities as $r) {
                $cnt = $db->querySingle("SELECT COUNT(*) FROM achievements a JOIN achievements_unlocked au ON a.id = au.achievement_id WHERE a.rarity='$r' AND au.user_id=$userId");
                $tot = $db->querySingle("SELECT COUNT(*) FROM achievements WHERE rarity='$r'");
                if ($tot > 0) {
                    $rarityCounts[$r] = ['cnt' => $cnt, 'tot' => $tot];
                }
            }

            echo json_encode([
                'status' => 'success',
                'achievements' => $achArr,
                'total' => $total,
                'unlocked' => $unlocked,
                'rarityCounts' => $rarityCounts
            ]);
            break;

        case 'buyWeapon':
            $userId = $_SESSION['user_id'] ?? 1;
            $rarity = $_POST['rarity'] ?? '';
            $weapons = [
                'uncommon' => ['cost'=>600, 'prev'=>'none'],
                'rare'     => ['cost'=>1500, 'prev'=>'uncommon'],
                'epic'     => ['cost'=>5000, 'prev'=>'rare'],
                'legendary'=> ['cost'=>8000, 'prev'=>'epic'],
                'mythic'   => ['cost'=>12000, 'prev'=>'legendary'],
                'divine'   => ['cost'=>20000, 'prev'=>'mythic'],
            ];

            if (!isset($weapons[$rarity])) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid weapon rarity']);
                break;
            }

            $player = getPlayer($db, $userId);
            $gold = getGold($db, $userId);
            $current = $player['weapon_rarity'] ?: 'none';

            // Check progression
            if ($current !== $weapons[$rarity]['prev'] && $current !== $rarity) {
                echo json_encode(['status' => 'error', 'message' => 'LOCKED! Buy the previous rarity first.']);
                break;
            }

            // Check Divine requirements
            if ($rarity === 'divine') {
                $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=" . (int)$userId);
                $achTotal = $db->querySingle("SELECT COUNT(*) FROM achievements");
                $achUnlocked = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=" . (int)$userId);
                
                if ($player['level'] < 200) {
                    echo json_encode(['status' => 'error', 'message' => "NOT WORTHY! Reach Level 200 first. (Current: {$player['level']})"]);
                    break;
                }
                if ($totalDone < 1000) {
                    echo json_encode(['status' => 'error', 'message' => "NOT WORTHY! Complete 1,000 quests first. (Current: $totalDone)"]);
                    break;
                }
                if ($achUnlocked < $achTotal) {
                    echo json_encode(['status' => 'error', 'message' => "NOT WORTHY! Unlock all achievements first. ($achUnlocked/$achTotal)"]);
                    break;
                }
            }

            if ($gold >= $weapons[$rarity]['cost']) {
                $u1 = $db->prepare("UPDATE player_gold SET total=total-? WHERE id=?");
                $u1->bindValue(1, $weapons[$rarity]['cost']);
                $u1->bindValue(2, $userId);
                $u1->execute();

                $u2 = $db->prepare("UPDATE player SET weapon_rarity=? WHERE id=?");
                $u2->bindValue(1, $rarity);
                $u2->bindValue(2, $userId);
                $u2->execute();
                
                // Log purchase
                $stmtLog = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
                $stmtLog->bindValue(1, $userId);
                $stmtLog->bindValue(2, -$weapons[$rarity]['cost']);
                $stmtLog->bindValue(3, "Bought $rarity Weapon");
                $stmtLog->execute();

                echo json_encode(['status' => 'success', 'message' => "✓ EQUIPPED " . strtoupper($rarity) . " WEAPON!"]);
            } else {
                echo json_encode(['status' => 'error', 'message' => '✕ NOT ENOUGH GOLD!']);
            }
            break;

        case 'buyItem':
            $userId = $_SESSION['user_id'] ?? 1;
            $items = [
                'xp_boost' => ['name'=>'XP Scroll', 'cost'=>50, 'xp'=>100],
                'xp_mega'  => ['name'=>'Mega XP Tome', 'cost'=>150, 'xp'=>300],
                'xp_legend'=> ['name'=>'Legendary Scroll', 'cost'=>400, 'xp'=>1000],
            ];
            $key = $_POST['item'] ?? '';
            if (!isset($items[$key])) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid item']);
                break;
            }

            // Check cooldown (3 days = 72 hours)
            $sourceName = "Bought Item: {$items[$key]['name']}";
            $stmtLast = $db->prepare("SELECT created_at FROM gold_log WHERE user_id=? AND source=? ORDER BY created_at DESC LIMIT 1");
            $stmtLast->bindValue(1, $userId);
            $stmtLast->bindValue(2, $sourceName);
            $lastPurchase = $stmtLast->execute()->fetchArray(SQLITE3_ASSOC);
            
            if ($lastPurchase) {
                $lastTime = strtotime($lastPurchase['created_at']);
                $diff = time() - $lastTime;
                $cooldown = 3 * 24 * 60 * 60; // 3 days
                if ($diff < $cooldown) {
                    $remaining = $cooldown - $diff;
                    $days = floor($remaining / 86400);
                    $hours = floor(($remaining % 86400) / 3600);
                    $msg = "COOLDOWN! ";
                    if ($days > 0) $msg .= "$days d ";
                    $msg .= "$hours h remaining.";
                    echo json_encode(['status' => 'error', 'message' => $msg]);
                    break;
                }
            }

            $gold = getGold($db, $userId);
            if ($gold >= $items[$key]['cost']) {
                $u1 = $db->prepare("UPDATE player_gold SET total=total-? WHERE id=?");
                $u1->bindValue(1, $items[$key]['cost']);
                $u1->bindValue(2, $userId);
                $u1->execute();
                
                // Log purchase
                $stmtLog = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
                $stmtLog->bindValue(1, $userId);
                $stmtLog->bindValue(2, -$items[$key]['cost']);
                $stmtLog->bindValue(3, $sourceName);
                $stmtLog->execute();

                addXP($db, $items[$key]['xp'], $userId);
                $newAch = checkAchievements($db, $userId);
                echo json_encode(['status' => 'success', 'message' => "✓ PURCHASED {$items[$key]['name']}!", 'new_achievements' => $newAch]);
            } else {
                echo json_encode(['status' => 'error', 'message' => '✕ NOT ENOUGH GOLD!']);
            }
            break;

        case 'getStatsData':
            $userId = $_SESSION['user_id'] ?? 1;
            $player = getPlayer($db, $userId);
            $gold = getGold($db, $userId);
            
            $uid = (int)$userId;
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$uid");
            $totalXPEarned = $db->querySingle("SELECT COALESCE(SUM(xp_reward),0) FROM quests WHERE completed=1 AND user_id=$uid");
            $totalGoldEarned = $db->querySingle("SELECT COALESCE(SUM(gold_reward),0) FROM quests WHERE completed=1 AND user_id=$uid");
            $hardDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND difficulty='hard' AND user_id=$uid");
            $legendaryDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND difficulty='legendary' AND user_id=$uid");
            
            $catData = [];
            $catStmt = $db->prepare("SELECT category, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=? GROUP BY category ORDER BY cnt DESC");
            $catStmt->bindValue(1, $userId);
            $catRes = $catStmt->execute();
            while ($r = $catRes->fetchArray(SQLITE3_ASSOC)) $catData[] = $r;
            
            $last7 = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $stmt7 = $db->prepare("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)=? AND user_id=?");
                $stmt7->bindValue(1, $date);
                $stmt7->bindValue(2, $userId);
                $cnt = $stmt7->execute()->fetchArray()[0];
                $last7[] = ['date' => date('D', strtotime($date)), 'count' => (int)$cnt];
            }
            
            $diffData = [];
            $diffStmt = $db->prepare("SELECT difficulty, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=? GROUP BY difficulty");
            $diffStmt->bindValue(1, $userId);
            $diffRes = $diffStmt->execute();
            while ($r = $diffRes->fetchArray(SQLITE3_ASSOC)) $diffData[$r['difficulty']] = $r['cnt'];
            
            echo json_encode([
                'status' => 'success',
                'player' => $player,
                'gold' => $gold,
                'summary' => [
                    'totalDone' => $totalDone,
                    'totalXPEarned' => $totalXPEarned,
                    'totalGoldEarned' => $totalGoldEarned,
                    'hardDone' => $hardDone,
                    'legendaryDone' => $legendaryDone,
                    'achDone' => $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$uid")
                ],
                'catData' => $catData,
                'last7' => $last7,
                'diffData' => $diffData
            ]);
            break;

        case 'getLeaderboardData':
            $userId = $_SESSION['user_id'] ?? 1;
            $player = getPlayer($db, $userId);
            $gold = getGold($db, $userId);
            $uid = (int)$userId;
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$uid");
            $achDone = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$uid");
            $totalXP = $db->querySingle("SELECT COALESCE(SUM(xp_reward),0) FROM quests WHERE completed=1 AND user_id=$uid");
            
            echo json_encode([
                'status' => 'success',
                'player' => $player,
                'gold' => $gold,
                'totalDone' => $totalDone,
                'achDone' => $achDone,
                'totalXP' => $totalXP
            ]);
            break;

        case 'getDailyLogData':
            $userId = $_SESSION['user_id'] ?? 1;
            
            $todayStmt = $db->prepare("SELECT * FROM quests WHERE completed=1 AND date(completed_at)=date('now') AND user_id=? ORDER BY completed_at DESC");
            $todayStmt->bindValue(1, $userId);
            $todayRes = $todayStmt->execute();
            $todayArr = [];
            while ($r = $todayRes->fetchArray(SQLITE3_ASSOC)) $todayArr[] = $r;
            
            $heatmap = [];
            for ($i = 13; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $hStmt = $db->prepare("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)=? AND user_id=?");
                $hStmt->bindValue(1, $d);
                $hStmt->bindValue(2, $userId);
                $cnt = $hStmt->execute()->fetchArray()[0];
                $heatmap[] = ['date' => $d, 'label' => date('D d', strtotime($d)), 'count' => (int)$cnt];
            }
            
            $pendingStmt = $db->prepare("SELECT * FROM quests WHERE completed=0 AND user_id=? ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at ASC LIMIT 8");
            $pendingStmt->bindValue(1, $userId);
            $pendingRes = $pendingStmt->execute();
            $pendArr = [];
            while ($r = $pendingRes->fetchArray(SQLITE3_ASSOC)) $pendArr[] = $r;
            
            echo json_encode([
                'status' => 'success',
                'todayQuests' => $todayArr,
                'heatmap' => $heatmap,
                'pending' => $pendArr,
                'player' => getPlayer($db, $userId)
            ]);
            break;

        case 'resetProgress':
            $userId = $_SESSION['user_id'] ?? 1;
            
            $r1 = $db->prepare("DELETE FROM quests WHERE user_id=?");
            $r1->bindValue(1, $userId);
            $r1->execute();

            $r2 = $db->prepare("DELETE FROM achievements_unlocked WHERE user_id=?");
            $r2->bindValue(1, $userId);
            $r2->execute();

            $r3 = $db->prepare("UPDATE player SET level=1, xp=0, xp_next=100 WHERE id=?");
            $r3->bindValue(1, $userId);
            $r3->execute();
            $db->exec("UPDATE player_gold SET total=0 WHERE id=$userId");
            echo json_encode(['status' => 'success', 'message' => '⚠️ Your progress has been reset!']);
            break;

        case 'giveGold':
            $userId = $_SESSION['user_id'] ?? 1;
            $db->exec("UPDATE player_gold SET total=total+500 WHERE id=$userId");
            echo json_encode(['status' => 'success', 'message' => '✓ +500 GOLD added!']);
            break;

        case 'giveXP':
            $userId = $_SESSION['user_id'] ?? 1;
            addXP($db, 500, $userId);
            $newAch = checkAchievements($db, $userId);
            echo json_encode(['status' => 'success', 'message' => '✓ +500 XP added!', 'new_achievements' => $newAch]);
            break;

        case 'addSampleQuests':
            $userId = $_SESSION['user_id'] ?? 1;
            $samples = [
                ['Complete daily workout', 'Go to gym for 1 hour', 'health', 'high', 'medium'],
                ['Read 30 pages', 'Continue reading current book', 'learning', 'normal', 'easy'],
                ['Finish project report', 'Complete Q4 analysis', 'work', 'urgent', 'hard'],
                ['Call mom', 'Weekly family check-in', 'social', 'high', 'easy'],
                ['Review budget', 'Track monthly expenses', 'finance', 'normal', 'easy'],
                ['Meditate 15 mins', 'Morning meditation session', 'personal', 'normal', 'easy'],
                ['Learn 10 words', 'Spanish vocabulary practice', 'learning', 'normal', 'easy'],
                ['Push-up challenge', '100 push-ups today', 'health', 'high', 'medium'],
                ['Send 3 job apps', 'Apply to dream companies', 'work', 'urgent', 'hard'],
                ['Cook healthy meal', 'Meal prep for week', 'health', 'normal', 'easy'],
            ];
            $xpMap = ['easy'=>25,'medium'=>50,'hard'=>100,'legendary'=>250];
            $gMap = ['easy'=>10,'medium'=>25,'hard'=>50,'legendary'=>150];
            $stmt = $db->prepare("INSERT INTO quests (user_id, title, description, category, priority, difficulty, xp_reward, gold_reward) VALUES (?,?,?,?,?,?,?,?)");
            foreach ($samples as $s) {
                $stmt->reset();
                $stmt->bindValue(1,$userId); $stmt->bindValue(2,$s[0]); $stmt->bindValue(3,$s[1]); $stmt->bindValue(4,$s[2]);
                $stmt->bindValue(5,$s[3]); $stmt->bindValue(6,$s[4]);
                $stmt->bindValue(7,$xpMap[$s[4]]??25); $stmt->bindValue(8,$gMap[$s[4]]??10);
                $stmt->execute();
            }
            echo json_encode(['status' => 'success', 'message' => '✓ 10 sample quests added!']);
            break;

        case 'getUserRewards':
            $userId = $_SESSION['user_id'] ?? 1;
            $rewards = [];
            $stmt = $db->prepare("SELECT * FROM user_rewards WHERE user_id=? ORDER BY created_at DESC");
            $stmt->bindValue(1, $userId);
            $res = $stmt->execute();
            while($r = $res->fetchArray(SQLITE3_ASSOC)) $rewards[] = $r;
            echo json_encode(['status' => 'success', 'data' => $rewards]);
            break;

        case 'addUserReward':
            $userId = $_SESSION['user_id'] ?? 1;
            $title = trim($_POST['title'] ?? '');
            $cost = intval($_POST['cost'] ?? 100);
            $desc = trim($_POST['description'] ?? '');
            $icon = trim($_POST['icon'] ?? '🎁');

            if($title) {
                $stmt = $db->prepare("INSERT INTO user_rewards (user_id, title, description, cost, icon) VALUES (?, ?, ?, ?, ?)");
                $stmt->bindValue(1, $userId);
                $stmt->bindValue(2, $title);
                $stmt->bindValue(3, $desc);
                $stmt->bindValue(4, $cost);
                $stmt->bindValue(5, $icon);
                if($stmt->execute()) {
                    echo json_encode(['status' => 'success']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Failed to add reward']);
                }
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Title is required']);
            }
            break;

        case 'deleteUserReward':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $stmt = $db->prepare("DELETE FROM user_rewards WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $id);
                $stmt->bindValue(2, $userId);
                $stmt->execute();
                echo json_encode(['status' => 'success']);
            }
            break;

        case 'redeemUserReward':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $stmt = $db->prepare("SELECT * FROM user_rewards WHERE id=? AND user_id=?");
                $stmt->bindValue(1, $id);
                $stmt->bindValue(2, $userId);
                $reward = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
                
                $gold = getGold($db, $userId);
                
                if($reward) {
                    if($gold >= $reward['cost']) {
                        $u1 = $db->prepare("UPDATE player_gold SET total = total - ? WHERE id=?");
                        $u1->bindValue(1, $reward['cost']);
                        $u1->bindValue(2, $userId);
                        $u1->execute();

                        $u2 = $db->prepare("UPDATE user_rewards SET redeemed_count = redeemed_count + 1 WHERE id=?");
                        $u2->bindValue(1, $id);
                        $u2->execute();
                        
                        // Log redemption
                        $stmtLog = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
                        $stmtLog->bindValue(1, $userId);
                        $stmtLog->bindValue(2, -$reward['cost']);
                        $stmtLog->bindValue(3, "Redeemed Reward: \"{$reward['title']}\"");
                        $stmtLog->execute();
                        
                        echo json_encode(['status' => 'success', 'message' => "✓ REDEEMED: {$reward['title']}!"]);
                    } else {
                        echo json_encode(['status' => 'error', 'message' => '✕ NOT ENOUGH GOLD!']);
                    }
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Reward not found']);
                }
            }
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
}

function applyQuestPenalties($db, $userId) {
    $today = date('Y-m-d');
    
    // Find active, non-paused quests that are overdue
    $stmt = $db->prepare("SELECT * FROM quests WHERE user_id=? AND completed=0 AND is_paused=0 AND (due_date IS NOT NULL AND due_date != '') AND due_date < ?");
    $stmt->bindValue(1, $userId);
    $stmt->bindValue(2, $today);
    $res = $stmt->execute();
    
    $totalPenalty = 0;
    
    while ($q = $res->fetchArray(SQLITE3_ASSOC)) {
        $lastCheckStr = $q['last_penalty_date'] ?: $q['due_date'];
        
        $lastDate = new DateTime($lastCheckStr);
        $currDate = new DateTime($today);
        
        $lastDate->setTime(0,0,0);
        $currDate->setTime(0,0,0);
        
        $diff = $currDate->diff($lastDate)->days;
        
        if ($diff > 0) {
            $penalty = $diff * 10;
            $totalPenalty += $penalty;
            
            // Log the penalty
            $stmtLog = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
            $stmtLog->bindValue(1, $userId);
            $stmtLog->bindValue(2, -$penalty);
            $stmtLog->bindValue(3, "Penalty: Overdue \"{$q['title']}\"");
            $stmtLog->execute();
            
            // Update the quest last check date to today
            $uStmt = $db->prepare("UPDATE quests SET last_penalty_date = ? WHERE id = ?");
            $uStmt->bindValue(1, $today);
            $uStmt->bindValue(2, $q['id']);
            $uStmt->execute();
        }
    }
    
    if ($totalPenalty > 0) {
        $uGold = $db->prepare("UPDATE player_gold SET total = total - ? WHERE id = ?");
        $uGold->bindValue(1, $totalPenalty);
        $uGold->bindValue(2, $userId);
        $uGold->execute();
    }
}

?>
