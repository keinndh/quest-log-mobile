$(document).ready(function() {
    loadNav();
    loadSettings();
});

function loadNav() {
    const response = window.db.getDashboardData();
    if(response.status === 'success') {
        const p = response.player;
        const gold = response.gold;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;

        $("#nav-level").text(`LV${p.level}`);
        $("#nav-name").text(p.name.toUpperCase());
        $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
        $("#nav-xp-fill").css("width", `${xpPct}%`);
        $("#nav-gold").text(`💰 ${gold}G`);
    }
}

function loadSettings() {
    const p = window.db.get('ql_player');
    if(p) {
        $("#player-name").text(p.name);
        $("#player-class").text(p.class);
    }
}

async function forceSync() {
    showMessage('success', "Cloud Sync started...");
    const res = await window.db.forceSync();
    showMessage(res.status, res.message);
}
window.forceSync = forceSync;

function resetProgress() {
    if(confirm('⚠️ WARNING: This will DELETE ALL your quests and RESET your character! Are you absolutely sure?')) {
        const res = window.db.resetProgress();
        showMessage('warning', res.message);
        loadSettings();
    }
}
window.resetProgress = resetProgress;

async function deleteAccount() {
    if(confirm('🚨 ULTIMATE WARNING: This will PERMANENTLY DELETE your account and ALL data from both local and cloud. There is no recovery. Are you absolutely sure?')) {
        const confirmText = prompt('Please type "DELETE" to confirm:');
        if (confirmText === 'DELETE') {
            showMessage('error', "💀 Commencing deletion...");
            const res = await window.db.deleteAccount();
            
            if (res.status === 'success') {
                alert(res.message);
                window.location.href = '../login.html';
            } else {
                showMessage('error', res.message);
            }
        }
    }
}
window.deleteAccount = deleteAccount;

// Data Portability: Export
function exportData() {
    try {
        const data = {
            player: window.db.get('ql_player'),
            quests: window.db.get('ql_quests'),
            achievements: window.db.get('ql_achievements'),
            rewards: window.db.get('ql_rewards'),
            logs: window.db.get('ql_logs'),
            export_date: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `quest_log_backup_${new Date().toISOString().slice(0,10)}.json`;
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showMessage('success', "💾 Backup created successfully!");
    } catch (e) {
        showMessage('error', "Failed to export data: " + e.message);
    }
}
window.exportData = exportData;

// Data Portability: Import
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.player || !data.quests) {
                throw new Error("Invalid backup file format.");
            }

            if (confirm("⚠️ Import this backup? This will OVERWRITE your current progress!")) {
                if (data.player) window.db.save('ql_player', data.player);
                if (data.quests) window.db.save('ql_quests', data.quests);
                if (data.achievements) window.db.save('ql_achievements', data.achievements);
                if (data.rewards) window.db.save('ql_rewards', data.rewards);
                if (data.logs) window.db.save('ql_logs', data.logs);

                showMessage('success', "🛡️ Data restored successfully! Reloading...");
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            showMessage('error', "Failed to import data: " + err.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}
window.importData = importData;

function showMessage(type, text) {
    let color = type === 'success' ? 'var(--accent-green)' : (type === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)');
    $("#system-message").css('border-color', color).show();
    $("#system-message-text").css('color', color).text(text);
    setTimeout(() => { $("#system-message").fadeOut(); }, 4000);
}
