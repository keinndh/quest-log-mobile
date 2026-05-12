$(document).ready(function() {
    loadLeaderboard();
});

function loadLeaderboard() {
    const res = window.db.getLeaderboardData();
    if(res.status === 'success') {
        const p = res.player;
        const gold = res.gold;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;

        // Nav
        $("#nav-level").text(`LV${p.level}`);
        $("#nav-name").text(p.name.toUpperCase());
        $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
        $("#nav-xp-fill").css("width", `${xpPct}%`);
        $("#nav-gold").text(`💰 ${gold}G`);

        // Rank
        const [icon, title, rarity] = getRank(p.level, res.totalDone);
        $("#rank-icon-big").text(icon);
        $("#rank-title-big").text(title.toUpperCase());
        $("#rank-player-name").text(p.name);
        
        $("#rank-badges-container").html(`
            <span class="pixel-badge badge-gold">LV ${p.level}</span>
            <span class="pixel-badge badge-purple">${res.totalDone} QUESTS</span>
            <span class="pixel-badge badge-green">${res.achDone} ACHIEVEMENTS</span>
            <span class="pixel-badge ${getRarityClass(rarity)}">${rarity.toUpperCase()} TIER</span>
        `);

        // Tiers
        renderTiers(rarity);

        // Milestones
        renderMilestones(p, res);

        // Score
        renderScore(p, res, gold);
    }
}

function getRank(level, quests) {
    if (level >= 20) return ['🔮','Mythic Champion','mythic'];
    if (level >= 15) return ['👑','Legendary Hero','legendary'];
    if (level >= 10) return ['💎','Epic Swordsman','epic'];
    if (level >= 5) return ['⭐','Rare Adventurer','rare'];
    if (level >= 3) return ['🛡️','Uncommon Knight','uncommon'];
    return ['⚔️','Common Swordsman','common'];
}

function renderTiers(currentRarity) {
    const tiers = [
        ['⚔️','Common Swordsman','Lv1+','common','badge-gold'],
        ['🛡️','Uncommon Knight','Lv3+','uncommon','badge-green'],
        ['⭐','Rare Adventurer','Lv5+','rare','badge-cyan'],
        ['💎','Epic Swordsman','Lv10+','epic','badge-purple'],
        ['👑','Legendary Hero','Lv15+','legendary','badge-orange'],
        ['🔮','Mythic Champion','Lv20+','mythic','badge-red'],
    ];

    let html = '';
    tiers.forEach(([icon, title, req, rarity, badgeClass]) => {
        const isCurrent = rarity === currentRarity;
        html += `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:${isCurrent?'rgba(255,215,0,0.08)':'var(--card-bg)'};border:2px solid ${isCurrent?'var(--gold)':'var(--gold-dark)'};margin-bottom:6px;">
                <span style="font-size:24px;">${icon}</span>
                <div style="flex:1;">
                    <div style="font-size:9px;color:${isCurrent?'var(--gold)':'var(--text-main)'};">${title}</div>
                    <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);">${req}</div>
                </div>
                <span class="pixel-badge ${badgeClass}">${rarity.toUpperCase()}</span>
                ${isCurrent ? '<span class="blink-anim" style="font-size:10px;color:var(--accent-green);">◀ YOU</span>' : ''}
            </div>
        `;
    });
    $("#tiers-container").html(html);
}

function renderMilestones(p, res) {
    const milestones = [
        ['Complete 15 quests', 15, res.totalDone, '🛡️'],
        ['Complete 100 quests', 100, res.totalDone, '⭐'],
        ['Complete 250 quests', 250, res.totalDone, '💎'],
        ['Complete 500 quests', 500, res.totalDone, '👑'],
        ['Complete 1000 quests', 1000, res.totalDone, '🔮'],
        ['Reach Level 10', 10, p.level, '⚔️'],
        ['Reach Level 50', 50, p.level, '🛡️'],
        ['Reach Level 100', 100, p.level, '💎'],
        ['Reach Level 200', 200, p.level, '🌟'],
    ];

    let html = '';
    milestones.forEach(([label, target, current, icon]) => {
        const done = current >= target;
        const pct = Math.min(100, Math.round((current / target) * 100));
        html += `
            <div class="milestone-row ${done?'milestone-done':''}">
                <span style="font-size:20px;">${icon}</span>
                <div style="flex:1;">
                    <div style="font-size:8px;color:${done?'var(--accent-green)':'var(--text-main)'};margin-bottom:6px;">${label}</div>
                    <div class="stat-track">
                        <div class="stat-fill" style="width:${pct}%;background:${done?'var(--accent-green)':'linear-gradient(90deg,var(--purple-bright),var(--gold))'};"></div>
                    </div>
                    <div style="font-family:'VT323';font-size:13px;color:var(--text-dim);margin-top:2px;">${Math.min(current,target)}/${target}</div>
                </div>
                <div style="font-size:18px;">${done ? '✅' : '🔒'}</div>
            </div>
        `;
    });
    $("#milestones-container").html(html);
}

function renderScore(p, res, gold) {
    const score = (p.level * 100) + (res.totalDone * 10) + (res.achDone * 25) + Math.floor(res.totalXP / 10) + gold;
    const breakdown = [
        {label:'Level Score', val:p.level * 100, note:'⭐ Level × 100'},
        {label:'Quest Score', val:res.totalDone * 10, note:'⚔️ Quests × 10'},
        {label:'Achievement Score', val:res.achDone * 25, note:'🏆 Achievements × 25'},
        {label:'XP Bonus', val:Math.floor(res.totalXP / 10), note:'✨ Total XP ÷ 10'},
        {label:'Gold Bonus', val:gold, note:'💰 Current Gold'},
    ];

    let html = '';
    breakdown.forEach(item => {
        html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,215,0,0.1);">
                <div>
                    <div style="font-size:9px;color:var(--text-main);">${item.label}</div>
                    <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);">${item.note}</div>
                </div>
                <div style="font-family:'VT323';font-size:22px;color:var(--gold);">${new Intl.NumberFormat().format(item.val)}</div>
            </div>
        `;
    });
    $("#score-breakdown-container").html(html);
    $("#total-score").text(new Intl.NumberFormat().format(score));
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
