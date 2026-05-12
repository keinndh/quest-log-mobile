<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/db.php';

$db = getDB();

if(isset($_POST['action'])) {
    $action = $_POST['action'];

    switch($action) {
        case 'login':
            $user = trim($_POST['username'] ?? '');
            $pass = $_POST['password'] ?? '';
            
            $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->bindValue(1, $user);
            $res = $stmt->execute();
            $row = $res->fetchArray(SQLITE3_ASSOC);
            
            if($row && password_verify($pass, $row['password'])) {
                $_SESSION['user_id'] = $row['id'];
                $_SESSION['username'] = $row['username'];
                echo json_encode(['status' => 'success']);
            } else {
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
            
            $totalCompleted = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
            $totalPending = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=0 AND user_id=$userId");
            $todayCompleted = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)=date('now') AND user_id=$userId");
            
            $achTotal = $db->querySingle("SELECT COUNT(*) FROM achievements");
            $achUnlocked = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$userId");
            
            $recentQuests = [];
            $rq = $db->query("SELECT * FROM quests WHERE user_id=$userId ORDER BY created_at DESC LIMIT 5");
            while ($q = $rq->fetchArray(SQLITE3_ASSOC)) {
                $recentQuests[] = $q;
            }
 
            $recentAch = [];
            $ra = $db->query("SELECT a.*, au.unlocked_at FROM achievements a JOIN achievements_unlocked au ON a.id = au.achievement_id WHERE au.user_id=$userId ORDER BY au.unlocked_at DESC LIMIT 3");
            while ($a = $ra->fetchArray(SQLITE3_ASSOC)) {
                $a['unlocked'] = 1;
                $recentAch[] = $a;
            }
 
            $catData = [];
            $catRes = $db->query("SELECT category, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=$userId GROUP BY category ORDER BY cnt DESC");
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
 
            $where = ["user_id=$userId"];
            if ($filter === 'active') $where[] = 'completed=0';
            if ($filter === 'completed') $where[] = 'completed=1';
            if ($category !== 'all') $where[] = "category='" . SQLite3::escapeString($category) . "'";
            if ($search) $where[] = "(title LIKE '%" . SQLite3::escapeString($search) . "%' OR description LIKE '%" . SQLite3::escapeString($search) . "%')";
            
            $whereStr = 'WHERE ' . implode(' AND ', $where);
            
            $orderBy = match($sort) {
                'xp' => 'xp_reward DESC', 
                'priority' => "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END",
                'oldest' => 'created_at ASC', 
                default => 'created_at DESC'
            };
 
            $quests = [];
            $qRes = $db->query("SELECT * FROM quests $whereStr ORDER BY $orderBy");
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
                $q = $db->querySingle("SELECT * FROM quests WHERE id=$id AND user_id=$userId", true);
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
                $q = $db->querySingle("SELECT title, xp_reward, gold_reward FROM quests WHERE id=$id AND user_id=$userId", true);
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
                    
                    $db->exec("UPDATE quests SET completed=1, completed_at=datetime('now') WHERE id=$id AND user_id=$userId");
                    $db->exec("UPDATE player_gold SET total = total + $totalGold WHERE id=$userId");
                    
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
            $user = $db->querySingle("SELECT username FROM users WHERE id=$userId", true);
            $player['username'] = $user['username'] ?? '';
            $player['is_admin'] = ($player['username'] === 'admin');
            
            $gold = getGold($db, $userId);
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
            
            $str = min(99, 10 + $player['level'] * 3 + $totalDone);
            $intel = min(99, 10 + $player['level'] * 2);
            $hp = min(999, 100 + $player['level'] * 10);
            $mp = min(999, 50 + $player['level'] * 5);
            
            $recentAch = [];
            $achList = $db->query("SELECT a.*, au.unlocked_at FROM achievements a JOIN achievements_unlocked au ON a.id = au.achievement_id WHERE au.user_id=$userId ORDER BY au.unlocked_at DESC LIMIT 6");
            while ($a = $achList->fetchArray(SQLITE3_ASSOC)) {
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
            $current = $db->querySingle("SELECT class, class_locked FROM player WHERE id = $userId", true);
            
            // If class is being changed and it's locked
            $user = $db->querySingle("SELECT username FROM users WHERE id=$userId", true);
            $isAdmin = ($user['username'] === 'admin');

            if (!$isAdmin && $class !== $current['class'] && $current['class_locked'] == 1) {
                $totalAch = $db->querySingle("SELECT COUNT(*) FROM achievements");
                $unlockedAch = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id = $userId");
                
                if ($unlockedAch < $totalAch) {
                    echo json_encode(['status' => 'error', 'message' => 'CLASS LOCKED! Earn all achievements to change class again.']);
                    break;
                }
            }

            // Check if username already exists for another user
            $existing = $db->querySingle("SELECT id FROM users WHERE username = '" . SQLite3::escapeString($name) . "' AND id != $userId");
            if ($existing) {
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

            // Delete all user data
            $db->exec("DELETE FROM users WHERE id = $userId");
            $db->exec("DELETE FROM player WHERE id = $userId");
            $db->exec("DELETE FROM player_gold WHERE id = $userId");
            $db->exec("DELETE FROM quests WHERE user_id = $userId");
            $db->exec("DELETE FROM daily_log WHERE user_id = $userId");
            $db->exec("DELETE FROM gold_log WHERE user_id = $userId");
            $db->exec("DELETE FROM achievements_unlocked WHERE user_id = $userId");

            session_destroy();
            echo json_encode(['status' => 'success', 'message' => 'Account deleted. Farewell, Hero.']);
            break;

        case 'togglePause':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'];
            $res = $db->querySingle("SELECT is_paused FROM quests WHERE id=$id AND user_id=$userId", true);
            if ($res) {
                $newVal = $res['is_paused'] ? 0 : 1;
                $db->exec("UPDATE quests SET is_paused = $newVal WHERE id=$id");
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
            
            $sql = "SELECT a.*, CASE WHEN au.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked, au.unlocked_at FROM achievements a LEFT JOIN achievements_unlocked au ON a.id = au.achievement_id AND au.user_id = $userId";
            
            if ($filter === 'unlocked') {
                $sql .= " WHERE au.user_id IS NOT NULL";
            } elseif ($filter === 'locked') {
                $sql .= " WHERE au.user_id IS NULL";
            }
            
            $sql .= " ORDER BY unlocked DESC, rarity DESC, a.id ASC";
            
            $achs = $db->query($sql);
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
                'mythic'   => ['cost'=>12000, 'prev'=>'mythic'], // wait, mythic prev should be epic? no, legendary.
                'divine'   => ['cost'=>20000, 'prev'=>'mythic'],
            ];
            // Fix mythic prev
            $weapons['mythic']['prev'] = 'legendary';

            if (!isset($weapons[$rarity])) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid weapon rarity']);
                break;
            }

            $player = getPlayer($db, $userId);
            $gold = getGold($db, $userId);
            $current = $player['weapon_rarity'] ?: 'none';

            // Check progression
            if ($current !== $weapons[$rarity]['prev'] && $current !== $rarity) {
                // If they already have better or equal, they might be rebuying? 
                // But the user said: "if you dont buy the default weapon, you cant unlocked the next rarity"
                echo json_encode(['status' => 'error', 'message' => 'LOCKED! Buy the previous rarity first.']);
                break;
            }

            // Check Divine requirements
            if ($rarity === 'divine') {
                $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
                $achTotal = $db->querySingle("SELECT COUNT(*) FROM achievements");
                $achUnlocked = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$userId");
                
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
                $db->exec("UPDATE player_gold SET total=total-{$weapons[$rarity]['cost']} WHERE id=$userId");
                $db->exec("UPDATE player SET weapon_rarity='$rarity' WHERE id=$userId");
                
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
            $lastPurchase = $db->querySingle("SELECT created_at FROM gold_log WHERE user_id=$userId AND source='$sourceName' ORDER BY created_at DESC LIMIT 1");
            if ($lastPurchase) {
                $lastTime = strtotime($lastPurchase);
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
                $db->exec("UPDATE player_gold SET total=total-{$items[$key]['cost']} WHERE id=$userId");
                
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
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
            $totalXPEarned = $db->querySingle("SELECT COALESCE(SUM(xp_reward),0) FROM quests WHERE completed=1 AND user_id=$userId");
            $totalGoldEarned = $db->querySingle("SELECT COALESCE(SUM(gold_reward),0) FROM quests WHERE completed=1 AND user_id=$userId");
            $hardDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND difficulty='hard' AND user_id=$userId");
            $legendaryDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND difficulty='legendary' AND user_id=$userId");
            
            $catData = [];
            $catRes = $db->query("SELECT category, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=$userId GROUP BY category ORDER BY cnt DESC");
            while ($r = $catRes->fetchArray(SQLITE3_ASSOC)) $catData[] = $r;
            
            $last7 = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $cnt = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)='$date' AND user_id=$userId");
                $last7[] = ['date' => date('D', strtotime($date)), 'count' => (int)$cnt];
            }
            
            $diffData = [];
            $diffRes = $db->query("SELECT difficulty, COUNT(*) as cnt FROM quests WHERE completed=1 AND user_id=$userId GROUP BY difficulty");
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
                    'achDone' => $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$userId")
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
            $totalDone = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND user_id=$userId");
            $achDone = $db->querySingle("SELECT COUNT(*) FROM achievements_unlocked WHERE user_id=$userId");
            $totalXP = $db->querySingle("SELECT COALESCE(SUM(xp_reward),0) FROM quests WHERE completed=1 AND user_id=$userId");
            
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
            $todayQuests = $db->query("SELECT * FROM quests WHERE completed=1 AND date(completed_at)=date('now') AND user_id=$userId ORDER BY completed_at DESC");
            $todayArr = [];
            while ($r = $todayQuests->fetchArray(SQLITE3_ASSOC)) $todayArr[] = $r;
            
            $heatmap = [];
            for ($i = 13; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $cnt = $db->querySingle("SELECT COUNT(*) FROM quests WHERE completed=1 AND date(completed_at)='$d' AND user_id=$userId");
                $heatmap[] = ['date' => $d, 'label' => date('D d', strtotime($d)), 'count' => (int)$cnt];
            }
            
            $pending = $db->query("SELECT * FROM quests WHERE completed=0 AND user_id=$userId ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at ASC LIMIT 8");
            $pendArr = [];
            while ($r = $pending->fetchArray(SQLITE3_ASSOC)) $pendArr[] = $r;
            
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
            $db->exec("DELETE FROM quests WHERE user_id=$userId");
            $db->exec("DELETE FROM achievements_unlocked WHERE user_id=$userId");
            $db->exec("UPDATE player SET level=1, xp=0, xp_next=100 WHERE id=$userId");
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
            $res = $db->query("SELECT * FROM user_rewards WHERE user_id=$userId ORDER BY created_at DESC");
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
                $db->exec("DELETE FROM user_rewards WHERE id=$id AND user_id=$userId");
                echo json_encode(['status' => 'success']);
            }
            break;

        case 'redeemUserReward':
            $userId = $_SESSION['user_id'] ?? 1;
            $id = $_POST['id'] ?? 0;
            if($id) {
                $reward = $db->querySingle("SELECT * FROM user_rewards WHERE id=$id AND user_id=$userId", true);
                $gold = getGold($db, $userId);
                
                if($reward) {
                    if($gold >= $reward['cost']) {
                        $db->exec("UPDATE player_gold SET total = total - {$reward['cost']} WHERE id=$userId");
                        $db->exec("UPDATE user_rewards SET redeemed_count = redeemed_count + 1 WHERE id=$id");
                        
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
    // If due_date < today and completed=0 and is_paused=0
    $res = $db->query("SELECT * FROM quests WHERE user_id=$userId AND completed=0 AND is_paused=0 AND (due_date IS NOT NULL AND due_date != '') AND due_date < '$today'");
    
    $totalPenalty = 0;
    
    while ($q = $res->fetchArray(SQLITE3_ASSOC)) {
        // last_penalty_date tracks the last day we applied the penalty.
        // If it's NULL, we start from the due_date.
        $lastCheckStr = $q['last_penalty_date'] ?: $q['due_date'];
        
        $lastDate = new DateTime($lastCheckStr);
        $currDate = new DateTime($today);
        
        // Ensure time parts are zeroed for day-only comparison
        $lastDate->setTime(0,0,0);
        $currDate->setTime(0,0,0);
        
        $diff = $currDate->diff($lastDate)->days;
        
        if ($diff > 0) {
            $penalty = $diff * 10;
            $totalPenalty += $penalty;
            
            // Log the penalty
            $stmt = $db->prepare("INSERT INTO gold_log (user_id, amount, source) VALUES (?, ?, ?)");
            $stmt->bindValue(1, $userId);
            $stmt->bindValue(2, -$penalty);
            $stmt->bindValue(3, "Penalty: Overdue \"{$q['title']}\"");
            $stmt->execute();
            
            // Update the quest last check date to today
            $db->exec("UPDATE quests SET last_penalty_date = '$today' WHERE id = {$q['id']}");
        }
    }
    
    if ($totalPenalty > 0) {
        $db->exec("UPDATE player_gold SET total = total - $totalPenalty WHERE id = $userId");
    }
}

?>
