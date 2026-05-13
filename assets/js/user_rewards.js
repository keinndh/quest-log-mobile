let historyPage = 1;
const HISTORY_PER_PAGE = 5;

$(document).ready(function() {
    loadUserRewards();
});

function loadUserRewards() {
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

        const rewards = window.db.getActiveRewards();
        renderRewards(rewards, gold);
    }
}

function renderRewards(rewards, playerGold) {
    let html = '';
    if (rewards.length === 0) {
        html = `
            <div class="pixel-panel" style="text-align:center;padding:60px 40px;grid-column:1/-1;">
                <div style="font-size:60px;margin-bottom:20px;">🎁</div>
                <h2 class="pixel-title" style="font-size:14px;margin-bottom:12px;">NO REWARDS YET</h2>
                <p style="font-family:'VT323';font-size:18px;color:var(--text-dim);margin-bottom:24px;">Create quests with rewards to see them here! Complete the quest to unlock the reward.</p>
            </div>
        `;
    } else {
        rewards.forEach(r => {
            const isLocked = !r.unlocked;
            const canAfford = playerGold >= r.cost;

            let statusHtml = '';
            let cardStyle = '';

            if (isLocked) {
                // LOCKED state
                statusHtml = `<div class="pixel-badge" style="width:100%;text-align:center;font-size:8px;padding:6px 0;background:rgba(255,255,255,0.05);color:var(--text-dim);border:2px solid rgba(255,255,255,0.1);">🔒 LOCKED</div>`;
                cardStyle = 'opacity:0.5; filter:grayscale(0.6);';
            } else if (canAfford) {
                // UNLOCKED & can afford
                statusHtml = `<button onclick="redeemReward(${r.id})" class="btn-pixel btn-pixel-gold" style="width:100%;font-size:8px;">⚔️ REDEEM ${r.cost}G</button>`;
                cardStyle = 'border-color:var(--accent-green); box-shadow: 0 0 12px rgba(0,255,136,0.15);';
            } else {
                // UNLOCKED but can't afford
                statusHtml = `<button class="btn-pixel btn-pixel-outline" disabled style="width:100%;opacity:0.4;cursor:not-allowed;font-size:8px;">💰 NEED ${r.cost}G</button>`;
                cardStyle = 'border-color:var(--gold-dark);';
            }

            const lockLabel = isLocked
                ? `<div class="pixel-badge" style="font-size:7px;padding:2px 6px;background:rgba(255,255,255,0.05);color:var(--text-dim);margin-bottom:8px;">🔒 QUEST PENDING</div>`
                : `<div class="pixel-badge badge-green" style="font-size:7px;padding:2px 6px;margin-bottom:8px;">✓ QUEST COMPLETE</div>`;

            html += `
                <div class="reward-card pixel-card" style="${cardStyle}">
                    <button class="delete-reward" onclick="confirmDeleteReward(${r.id})" title="Delete Reward">✕</button>
                    <span class="reward-icon">${r.icon}</span>
                    <div style="font-size:12px;color:var(--gold);margin-bottom:4px;">${r.title.toUpperCase()}</div>
                    <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);margin-bottom:8px;min-height:32px;">
                        ${r.description || 'No description provided.'}
                    </div>
                    ${lockLabel}
                    <div class="reward-cost">💰 ${r.cost}G</div>
                    ${statusHtml}
                </div>
            `;
        });
    }
    $("#rewards-container").html(html);
}

function redeemReward(id) {
    if(!confirm("Are you sure you want to redeem this reward? Gold will be deducted.")) return;

    const res = window.db.redeemReward(id);
    if(res.status === 'success') {
        showMessage('success', res.message);
        loadUserRewards();
    } else {
        showMessage('error', res.message);
    }
}

function confirmDeleteReward(id) {
    if(!confirm("⚠️ Are you sure you want to permanently delete this reward? This cannot be undone.")) return;
    const res = window.db.deleteReward(id);
    if(res.status === 'success') {
        showMessage('success', '🗑️ Reward deleted.');
        loadUserRewards();
    } else {
        showMessage('error', res.message || 'Failed to delete.');
    }
}

function openRewardHistory() {
    historyPage = 1;
    renderRewardHistory();
    $('#reward-history-modal').fadeIn();
}

function renderRewardHistory() {
    const redeemed = window.db.getRedeemedRewards();
    const totalPages = Math.max(1, Math.ceil(redeemed.length / HISTORY_PER_PAGE));
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    const pageItems = redeemed.slice(start, start + HISTORY_PER_PAGE);

    let html = '';
    if (redeemed.length === 0) {
        html = `
            <div style="text-align:center;padding:40px;color:var(--text-dim);font-family:'VT323';font-size:20px;">
                No rewards redeemed yet.<br>Complete quests and claim your prizes!
            </div>
        `;
    } else {
        pageItems.forEach(r => {
            const date = r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
            html += `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:2px solid rgba(255,215,0,0.1);">
                    <span style="font-size:28px;">${r.icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:9px;color:var(--gold);">${r.title.toUpperCase()}</div>
                        <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);margin-top:2px;">${r.description || 'No description'}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-family:'VT323';font-size:14px;color:var(--accent-green);">✓ REDEEMED</div>
                        <div style="font-family:'VT323';font-size:12px;color:var(--text-dim);">${date}</div>
                        <div style="font-family:'VT323';font-size:12px;color:var(--gold);">-${r.cost}G</div>
                    </div>
                </div>
            `;
        });
    }

    // Pagination controls
    let paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = `
            <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;">
                <button class="btn-pixel btn-pixel-outline btn-sm" onclick="changeHistoryPage(-1)" ${historyPage <= 1 ? 'disabled style="opacity:0.3;"' : ''}>◀ PREV</button>
                <span style="font-family:'VT323';font-size:16px;color:var(--text-dim);">Page ${historyPage} / ${totalPages}</span>
                <button class="btn-pixel btn-pixel-outline btn-sm" onclick="changeHistoryPage(1)" ${historyPage >= totalPages ? 'disabled style="opacity:0.3;"' : ''}>NEXT ▶</button>
            </div>
        `;
    }

    $('#reward-history-content').html(html + paginationHtml);
}

function changeHistoryPage(delta) {
    const redeemed = window.db.getRedeemedRewards();
    const totalPages = Math.max(1, Math.ceil(redeemed.length / HISTORY_PER_PAGE));
    historyPage = Math.max(1, Math.min(totalPages, historyPage + delta));
    renderRewardHistory();
}

function showMessage(type, text) {
    let color = type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)';
    $("#system-message").css('border-color', color).show();
    $("#system-message-text").css('color', color).text(text);
    setTimeout(() => { $("#system-message").fadeOut(); }, 4000);
}

// Expose functions globally for inline onclick handlers
window.redeemReward = redeemReward;
window.confirmDeleteReward = confirmDeleteReward;
window.openRewardHistory = openRewardHistory;
window.changeHistoryPage = changeHistoryPage;
