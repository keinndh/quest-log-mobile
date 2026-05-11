<?php
require_once 'includes/db.php';
$db = getDB();
$res = $db->query("PRAGMA table_info(player)");
while($row = $res->fetchArray(SQLITE3_ASSOC)) {
    echo $row['name'] . "\n";
}
