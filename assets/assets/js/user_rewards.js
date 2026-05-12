$(document).ready(function() {
    loadUserRewards();

    $("#add-reward-form").on("submit", function(e) {
        e.preventDefault();
        const data = {
            action: 'addUserReward',
            title: $("#reward-title").val(),
            cost: $("#reward-cost").val(),
            icon: $("#reward-icon").val(),
            description: $("#reward-desc").val()
        };

        const res = window.db.addReward({
            title: $("#reward-title").val(),
            cost: $("#reward-cost").val(),
            icon: $("#reward-icon").val(),
            description: $("#reward-desc").val()
        });

        if(res.status === 'success') {
            $("#add-reward-modal").fadeOut();
            $("#add-reward-form")[0].reset();
            loadUserRewards();
            showMessage('success', '✓ Reward Created!');
        } else {
            showMessage('error', res.message);
        }
    });
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

        const rewards = window.db.getRewards();
        renderRewards(rewards, gold);
    }
}

function renderRewards(rewards, playerGold) {
    let html = '';
    if (rewards.length === 0) {
        html = `
            <div class="pixel-panel" style="text-align:center;padding:60px 40px;grid-column:1/-1;">
                <div style="font-size:60px;margin-bottom:20px;">🎁</div>
                <h2 class="pixel-title" style="font-size:14px;margin-bottom:12px;">NO REWARDS CREATED</h2>
                <p style="font-family:'VT323';font-size:18px;color:var(--text-dim);margin-bottom:24px;">No custom rewards yet. Create your first reward to treat yourself for your hard-won victories!</p>
                <button class="btn-pixel btn-pixel-gold btn-lg" onclick="$('#add-reward-modal').fadeIn()">➕ CREATE YOUR FIRST REWARD</button>
            </div>
        `;
    }
 else {
        rewards.forEach(r => {
            const canAfford = playerGold >= r.cost;
            const btnHtml = canAfford 
                ? `<button onclick="redeemReward(${r.id})" class="btn-pixel btn-pixel-gold" style="width:100%;">⚔️ REDEEM ${r.cost}G</button>`
                : `<button class="btn-pixel btn-pixel-outline" disabled style="width:100%;opacity:0.4;cursor:not-allowed;">💰 REDEEM ${r.cost}G</button>`;

            html += `
                <div class="reward-card pixel-card">
                    <button class="delete-reward" onclick="deleteReward(${r.id})">✕</button>
                    <span class="reward-icon">${r.icon}</span>
                    <div style="font-size:12px;color:var(--gold);margin-bottom:8px;">${r.title.toUpperCase()}</div>
                    <div style="font-family:'VT323';font-size:16px;color:var(--text-dim);margin-bottom:12px;min-height:40px;">
                        ${r.description || 'No description provided.'}
                    </div>
                    <div class="pixel-badge badge-purple" style="margin-bottom:12px;">Redeemed: ${r.redeemed_count}</div>
                    <div class="reward-cost">💰 ${new Intl.NumberFormat().format(r.cost)}G</div>
                    ${btnHtml}
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

function deleteReward(id) {
    if(!confirm("Delete this custom reward?")) return;
    const res = window.db.deleteReward(id);
    if(res.status === 'success') {
        loadUserRewards();
    }
}

function showMessage(type, text) {
    let color = type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)';
    $("#system-message").css('border-color', color).show();
    $("#system-message-text").css('color', color).text(text);
    setTimeout(() => { $("#system-message").fadeOut(); }, 4000);
}
