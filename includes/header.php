<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo $title ?? 'QUEST LOG — RPG TASK MANAGER'; ?></title>
<meta name="description" content="<?php echo $description ?? 'Turn your daily tasks into a pixel-art RPG adventure. Track quests, earn gold, and level up your life.'; ?>">
<meta name="theme-color" content="#0d0015">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/pixel.css">
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="manifest" href="manifest.json">
<script>
    window.csrfToken = '<?php echo $_SESSION['csrf_token'] ?? ''; ?>';
</script>
