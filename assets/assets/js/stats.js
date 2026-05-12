$(document).ready(function() {
    loadStats();
});

function loadStats() {
    const res = window.db.getStatsData();
    if(res.status === 'success') {
        const p = res.player;
        const gold = res.gold;
        const s = res.summary;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;

        // Nav
        $("#nav-level").text(`LV${p.level}`);
        $("#nav-name").text(p.name.toUpperCase());
        $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
        $("#nav-xp-fill").css("width", `${xpPct}%`);
        $("#nav-gold").text(`💰 ${gold}G`);

        // Big Stats
        $("#stat-done").text(s.totalDone);
        $("#stat-xp").text(new Intl.NumberFormat().format(s.totalXPEarned));
        $("#stat-gold").text(new Intl.NumberFormat().format(s.totalGoldEarned));
        $("#stat-level").text(p.level);

        // Activity Chart
        renderActivityChart(res.last7);

        // Categories
        renderCategories(res.catData);

        // Difficulty
        renderDifficulties(res.diffData);

        // Records
        renderRecords(p, gold, s);
    }
}

function renderActivityChart(last7) {
    let maxDay = Math.max(...last7.map(d => d.count), 1);
    let html = '';
    let totalWeek = 0;
    
    last7.forEach(day => {
        totalWeek += day.count;
        let h = Math.max(4, Math.round((day.count / maxDay) * 100));
        html += `
            <div class="bar-col">
                <div class="bar-fill" data-val="${day.count}" style="height:${h}%;"></div>
                <div class="bar-label">${day.date}</div>
            </div>
        `;
    });
    
    $("#activity-chart").html(html);
    $("#week-total").text(totalWeek);
    $("#day-avg").text((totalWeek / 7).toFixed(1));
}

function renderCategories(catData) {
    if(catData.length === 0) {
        $("#category-stats-container").html("<div style='text-align:center;padding:40px;font-family:\"VT323\";font-size:18px;color:var(--text-dim);'>Complete quests to see breakdown</div>");
        return;
    }

    const catColors = {work:'#00FFFF', health:'#00FF88', personal:'#CC44FF', learning:'#FFD700', finance:'#FF6600', social:'#FF2244'};
    const catIcons = {work:'💼', health:'💪', personal:'🧘', learning:'📚', finance:'💰', social:'🤝'};
    const total = catData.reduce((sum, c) => sum + c.cnt, 0);

    let html = '';
    catData.forEach(cat => {
        let pct = Math.round((cat.cnt / total) * 100);
        let color = catColors[cat.category] || '#FFD700';
        let icon = catIcons[cat.category] || '🎯';
        html += `
            <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:8px;">${icon} ${cat.category.toUpperCase()}</span>
                    <span style="font-size:8px;color:${color};">${cat.cnt} (${pct}%)</span>
                </div>
                <div class="stat-track">
                    <div class="stat-fill" style="width:${pct}%;background:${color};"></div>
                </div>
            </div>
        `;
    });
    $("#category-stats-container").html(html);
}

function renderDifficulties(diffData) {
    const diffs = {
        easy: {icon:'⚔️', color:'var(--accent-green)'},
        medium: {icon:'🗡️', color:'var(--accent-cyan)'},
        hard: {icon:'💀', color:'var(--accent-red)'},
        legendary: {icon:'🌟', color:'var(--accent-orange)'}
    };
    const total = Object.values(diffData).reduce((sum, c) => sum + c, 0) || 1;

    let html = '';
    Object.keys(diffs).forEach(diff => {
        let cnt = diffData[diff] || 0;
        let pct = Math.round((cnt / total) * 100);
        let {icon, color} = diffs[diff];
        html += `
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:8px;">${icon} ${diff.toUpperCase()}</span>
                    <span style="font-size:8px;color:${color};">${cnt}</span>
                </div>
                <div class="stat-track"><div class="stat-fill" style="width:${pct}%;background:${color};"></div></div>
            </div>
        `;
    });
    $("#difficulty-stats-container").html(html);
}

function renderRecords(p, gold, s) {
    const records = [
        {icon:'🧗', label:'Hard Quests Done', val:s.hardDone},
        {icon:'🌟', label:'Legendary Quests', val:s.legendaryDone},
        {icon:'🏆', label:'Achievements Unlocked', val:s.achDone},
        {icon:'💰', label:'Current Gold', val:new Intl.NumberFormat().format(gold) + 'G'},
        {icon:'⭐', label:'Current Level', val:'LV ' + p.level},
        {icon:'✨', label:'Total XP Earned', val:new Intl.NumberFormat().format(s.totalXPEarned) + ' XP'},
    ];

    let html = '';
    records.forEach(r => {
        html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,215,0,0.1);">
                <span style="font-size:9px;color:var(--text-dim);">${r.icon} ${r.label}</span>
                <span style="font-family:'VT323';font-size:18px;color:var(--gold);">${r.val}</span>
            </div>
        `;
    });
    $("#records-container").html(html);
}
