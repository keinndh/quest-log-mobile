let currentFilter = 'all';

$(document).ready(function() {
    loadNav();
    loadAchievements();

    $(".ach-filter").on("click", function(e) {
        e.preventDefault();
        $(".ach-filter").removeClass("active");
        $(this).addClass("active");
        currentFilter = $(this).data("filter");
        loadAchievements();
    });
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

function loadAchievements() {
    $("#ach-grid-container").html("<div style='text-align:center;padding:40px;color:var(--text-dim);font-family:\"VT323\";font-size:24px;grid-column:1/-1;'>Loading...</div>");

    const res = window.db.getAchievementsData(currentFilter);
    if(res.status === 'success') {
        // Update Progress Header
        $("#ach-count-text").text(`${res.unlocked} / ${res.total} UNLOCKED`);
        let pct = res.total > 0 ? Math.round((res.unlocked / res.total) * 100) : 0;
        $("#ach-pct-fill").css("width", `${pct}%`);
        $("#ach-pct-text").text(`${pct}% COMPLETE`);

        // Rarity Counts
        let rHtml = '';
        const rarities = ['common','uncommon','rare','epic','legendary','mythic'];
        const rarityColors = {'common':'var(--gold)','uncommon':'var(--accent-green)','rare':'var(--accent-cyan)','epic':'var(--purple-glow)','legendary':'var(--accent-orange)','mythic':'var(--accent-red)'};
        
        rarities.forEach(r => {
            if(res.rarityCounts[r]) {
                rHtml += `
                    <div style="text-align:center;">
                        <div style="font-size:14px;color:${rarityColors[r]};">${res.rarityCounts[r].cnt}/${res.rarityCounts[r].tot}</div>
                        <div style="font-size:7px;color:var(--text-dim);">${r.toUpperCase()}</div>
                    </div>
                `;
            }
        });
        $("#rarity-counts-container").html(rHtml);

        // Achievement Grid
        let aHtml = '';
        res.achievements.forEach(a => {
            let isUnlocked = a.unlocked === true || a.unlocked == 1;
            let rClass = `rarity-${a.rarity}`;
            let uClass = isUnlocked ? `unlocked ${rClass}` : 'locked';
            
            let lockOverlay = !isUnlocked ? `<span class="lock-overlay">🔒</span>` : '';
            
            let dateStr = '';
            if(isUnlocked && a.unlocked_at) {
                let d = new Date(a.unlocked_at);
                dateStr = `<div style="font-family:'VT323';font-size:12px;color:var(--accent-green);margin-top:8px;">✓ ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>`;
            }

            aHtml += `
                <div class="ach-card ${uClass}">
                    ${lockOverlay}
                    <span class="ach-icon">${a.icon}</span>
                    <div class="ach-title">${escapeHtml(a.title)}</div>
                    <div class="ach-desc">${escapeHtml(a.description)}</div>
                    <div class="ach-xp">+${a.xp_reward || 0}XP</div>
                    <div style="margin-top:8px;">
                        <span class="pixel-badge ${getRarityClass(a.rarity)}" style="font-size:7px;">${a.rarity.toUpperCase()}</span>
                    </div>
                    ${dateStr}
                </div>
            `;
        });
        
        if(res.achievements.length === 0) {
            aHtml = `
                <div class="pixel-panel" style="text-align:center;padding:60px 40px;grid-column:1/-1;">
                    <div style="font-size:60px;margin-bottom:20px;">🏆</div>
                    <h2 class="pixel-title" style="font-size:14px;margin-bottom:12px;">NO ACHIEVEMENTS FOUND</h2>
                    <p style="font-family:'VT323';font-size:18px;color:var(--text-dim);margin-bottom:24px;">Your legendary saga is just beginning! Complete quests to unlock medals and glory.</p>
                    <a href="quests.html" class="btn-pixel btn-pixel-gold btn-lg">⚔️ START YOUR FIRST QUEST</a>
                </div>
            `;
        }
        
        $("#ach-grid-container").addClass("grid-mobile-3").html(aHtml);
    }
}

function escapeHtml(unsafe) {
    if(!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function getRarityClass(rarity) {
    switch(rarity) {
        case 'uncommon': return 'badge-green';
        case 'rare': return 'badge-cyan';
        case 'epic': return 'badge-purple';
        case 'legendary': return 'badge-orange';
        case 'mythic': return 'badge-red';
        default: return 'badge-gold';
    }
}
