$(document).ready(function() {
    loadDailyLog();
});

function loadDailyLog() {
    const res = window.db.getDailyLogData();
    if(res.status === 'success') {
        const p = res.player;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;
        
        // Set Date Subtitle
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        $("#current-date-subtitle").text("Today's adventure: " + now.toLocaleDateString('en-US', options));

        // Today Summary
        const todayXP = res.todayQuests.reduce((sum, q) => sum + (q.xp_reward || 0), 0);
        const todayGold = res.todayQuests.reduce((sum, q) => sum + (q.gold_reward || 0), 0);
        
        $("#today-done-count").text(res.todayQuests.length);
        $("#today-xp-gain").text("+" + todayXP);
        $("#today-gold-gain").text("+" + todayGold);
        $("#today-pending-count").text(res.pending.length);
        
        $("#today-xp-text").text(`${p.xp}/${p.xp_next} (${xpPct}%)`);
        $("#today-xp-fill").css("width", `${xpPct}%`);
        $("#today-level-next").text(`LV ${p.level} → LV ${p.level + 1}`);

        // Completed Today
        renderCompletedToday(res.todayQuests);

        // Priority Queue
        renderPriorityQueue(res.pending);

        // Heatmap
        renderHeatmap(res.heatmap);
    }
}

function renderCompletedToday(quests) {
    if(quests.length === 0) {
        $("#today-quests-container").html(`
            <div style="text-align:center;padding:32px;font-family:'VT323';font-size:18px;color:var(--text-dim);">
                No quests completed yet today.<br>Get out there, hero! ⚔️
            </div>
            <a href="quests.html" class="btn-pixel btn-pixel-gold" style="width:100%;text-align:center;">📜 VIEW QUESTS</a>
        `);
        return;
    }

    const catIcons = {work:'💼', health:'💪', personal:'🧘', learning:'📚', finance:'💰', social:'🤝'};
    let html = '';
    quests.forEach(q => {
        let icon = catIcons[q.category] || '🎯';
        let time = new Date(q.completed_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        html += `
            <div class="daily-quest-row">
                <span style="font-size:20px;">${icon}</span>
                <div style="flex:1;">
                    <div style="font-size:8px;color:var(--text-main);">${escapeHtml(q.title)}</div>
                    <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);">${time} · ${q.difficulty.toUpperCase()}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-family:'VT323';font-size:16px;color:var(--gold);">+${q.xp_reward}XP</div>
                    <div style="font-family:'VT323';font-size:14px;color:var(--gold);">+${q.gold_reward}G</div>
                </div>
            </div>
        `;
    });
    $("#today-quests-container").html(html);
}

function renderPriorityQueue(quests) {
    if(quests.length === 0) {
        $("#priority-queue-container").html(`
            <div style="text-align:center;padding:32px;font-family:'VT323';font-size:20px;color:var(--accent-green);">
                All quests complete! You're a legend! 🌟
            </div>
        `);
        return;
    }

    const prioColors = {urgent:'var(--accent-red)', high:'var(--accent-orange)', normal:'var(--gold-dark)', low:'#3a006a'};
    const prioLabels = {urgent:'🔴 URGENT', high:'🟠 HIGH', normal:'🟡 NORMAL', low:'🔵 LOW'};
    const catIcons = {work:'💼', health:'💪', personal:'🧘', learning:'📚', finance:'💰', social:'🤝'};
    
    let html = '';
    quests.forEach(q => {
        let pColor = prioColors[q.priority] || 'var(--gold-dark)';
        let pLabel = prioLabels[q.priority] || '';
        let icon = catIcons[q.category] || '🎯';
        html += `
            <div style="display:flex;gap:10px;align-items:center;padding:10px;background:var(--card-bg);border:2px solid ${pColor};margin-bottom:6px;">
                <span style="font-size:16px;">${icon}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:8px;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(q.title)}</div>
                    <div style="font-family:'VT323';font-size:13px;color:${pColor};">${pLabel}</div>
                </div>
                <div style="font-family:'VT323';font-size:16px;color:var(--gold);flex-shrink:0;">+${q.xp_reward}XP</div>
            </div>
        `;
    });
    html += `<a href="quests.html" class="btn-pixel btn-pixel-purple" style="margin-top:8px;width:100%;text-align:center;">⚔️ GO TO QUESTS</a>`;
    $("#priority-queue-container").html(html);
}

function renderHeatmap(heatmap) {
    const todayStr = new Date().toISOString().split('T')[0];
    let html = '';
    heatmap.forEach(cell => {
        const isToday = cell.date === todayStr;
        const heatVal = cell.count >= 5 ? 'high' : Math.min(3, cell.count);
        const heatClass = 'heat-' + heatVal;
        const todayClass = isToday ? 'today-cell' : '';
        const dayName = new Date(cell.date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = new Date(cell.date).getDate();

        html += `
            <div class="heat-cell ${heatClass} ${todayClass}" title="${cell.label}: ${cell.count} quests">
                <div class="heat-num">${cell.count}</div>
                <div class="heat-day">${dayName}</div>
                <div style="font-size:9px;color:var(--text-dim);">${dayNum}</div>
            </div>
        `;
    });
    $("#heatmap-container").html(html);
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
