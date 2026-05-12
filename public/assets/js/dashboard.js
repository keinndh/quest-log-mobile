$(document).ready(function() {
    loadDashboard();
});

function loadDashboard() {
    const response = window.db.getDashboardData();
    if(response.status === 'success') {
            const p = response.player;
            const stats = response.stats;
            const gold = response.gold;
            const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;

            // Check if class is locked
            if (p.class_locked == 0) {
                $("#class-modal-overlay").addClass("open");
                // Disable scrolling on body while modal is open
                $("body").css("overflow", "hidden");
                
                // Store original name for later
                window.originalPlayerName = p.name;
            }

            // Populate Nav
            $("#nav-level").text(`LV${p.level}`);
            $("#nav-name").text(p.name.toUpperCase());
            $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
            $("#nav-xp-fill").css("width", `${xpPct}%`);
            $("#nav-gold").text(`💰 ${gold}G`);

            // Populate Hero Banner
            $("#hero-class").text(p.class.toUpperCase());
            $("#hero-level").text(`LEVEL ${p.level}`);
            $("#hero-name").text(p.name.toUpperCase());
            $("#hero-class-text").text(p.class);
            $("#hero-xp-text").text(`${p.xp} / ${p.xp_next} XP`);
            $("#hero-xp-fill").css("width", `${xpPct}%`);
            $("#hero-xp-percent").text(`${xpPct}% TO LEVEL ${p.level + 1}`);
            $("#hero-gold").text(`💰 ${gold} GOLD`);

            // Populate Stat Orbs
            $("#stat-quests-done").text(stats.totalCompleted);
            $("#stat-quests-active").text(stats.totalPending);
            $("#stat-achievements").text(`${stats.achUnlocked}/${stats.achTotal}`);
            $("#stat-today-wins").text(stats.todayCompleted);

            // Populate Quick Actions
            $("#action-quests-active").text(stats.totalPending);
            $("#action-ach-locked").text(stats.achTotal - stats.achUnlocked);

            // Populate Recent Quests
            let rqHtml = '';
            const catColors = {
                'work': 'var(--accent-cyan)', 'health': 'var(--accent-green)',
                'personal': 'var(--purple-glow)', 'learning': 'var(--gold)',
                'finance': 'var(--accent-orange)', 'social': 'var(--accent-red)'
            };

            if(response.recentQuests.length > 0) {
                response.recentQuests.forEach(q => {
                    let color = catColors[q.category] || 'var(--gold)';
                    let doneStr = q.completed ? '<span style="color:var(--accent-green);margin-left:8px;">✓ DONE</span>' : '';
                    let compClass = q.completed ? 'completed' : '';
                    
                    // format date
                    let d = new Date(q.created_at);
                    let dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    rqHtml += `
                        <div class="quest-item ${compClass}">
                            <div class="cat-dot" style="background:${color};margin-top:6px;"></div>
                            <div style="flex:1;">
                                <div class="quest-title">${escapeHtml(q.title)}</div>
                                <div class="quest-meta">
                                    ${q.category.toUpperCase()} · ${q.difficulty.toUpperCase()} · 
                                    <span style="color:var(--gold);">+${q.xp_reward}XP</span>
                                    ${doneStr}
                                </div>
                            </div>
                            <div style="font-size:7px;color:var(--text-dim);text-align:right;flex-shrink:0;">
                                ${dateStr}
                            </div>
                        </div>
                    `;
                });
            } else {
                rqHtml = `
                    <div style="text-align:center;padding:32px 20px;">
                        <div style="font-size:48px;margin-bottom:16px;">📜</div>
                        <div style="font-size:9px;color:var(--text-dim);margin-bottom:20px;">YOUR QUEST BOARD IS EMPTY</div>
                        <a href="pages/quests.html" class="btn-pixel btn-pixel-gold btn-sm">START YOUR FIRST QUEST</a>
                    </div>
                `;
            }
            $("#recent-quests-container").html(rqHtml);

            // Populate Recent Achievements
            let raHtml = '';
            if(response.recentAch.length > 0) {
                response.recentAch.forEach(a => {
                    let rClass = getRarityClass(a.rarity);
                    raHtml += `
                        <div style="display:flex;align-items:center;gap:16px;padding:14px;background:var(--card-bg);border:2px solid var(--gold-dark);margin-bottom:8px;">
                            <span style="font-size:28px;">${a.icon}</span>
                            <div>
                                <div style="font-size:9px;color:var(--gold);margin-bottom:4px;">${escapeHtml(a.title)}</div>
                                <div style="font-family:'VT323';font-size:15px;color:var(--text-dim);">${escapeHtml(a.description)}</div>
                            </div>
                            <span class="pixel-badge ${rClass}" style="margin-left:auto;">${a.rarity.toUpperCase()}</span>
                        </div>
                    `;
                });
            } else {
                raHtml = `
                    <div style="text-align:center;padding:32px 20px;border:2px dashed var(--gold-dark);background:rgba(255,215,0,0.03);">
                        <div style="font-size:32px;margin-bottom:12px;opacity:0.5;">🏆</div>
                        <div style="font-family:'VT323';font-size:16px;color:var(--text-dim);">No accolades earned yet.<br>Glory awaits the brave!</div>
                    </div>
                `;
            }
            $("#recent-achievements-container").html(raHtml);

            // Populate Category Breakdown
            if(response.categories.length > 0) {
                $("#category-panel").show();
                let catHtml = '';
                const mainColors = {
                    'work':'#00FFFF','health':'#00FF88','personal':'#CC44FF',
                    'learning':'#FFD700','finance':'#FF6600','social':'#FF2244'
                };
                const catIcons = {
                    'work':'💼','health':'💪','personal':'🧘',
                    'learning':'📚','finance':'💰','social':'🤝'
                };
                let maxCat = Math.max(...response.categories.map(c => c.cnt));

                response.categories.forEach(cat => {
                    let pct = maxCat > 0 ? Math.round((cat.cnt / maxCat) * 100) : 0;
                    let color = mainColors[cat.category] || '#FFD700';
                    let icon = catIcons[cat.category] || '🎯';

                    catHtml += `
                        <div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                <span style="font-size:8px;color:var(--text-main);">${icon} ${cat.category.toUpperCase()}</span>
                                <span style="font-size:8px;color:${color};">${cat.cnt}</span>
                            </div>
                            <div class="stat-track" style="height:6px;background:#222;border-radius:3px;overflow:hidden;">
                                <div class="stat-fill" style="width:${pct}%;background:${color};height:100%;border-radius:3px;"></div>
                            </div>
                        </div>
                    `;
                });
                $("#category-container").html(catHtml);
            } else {
                $("#category-panel").hide();
            }
        } else {
            console.error("Failed to load dashboard data");
        }
}

// Expose to global scope
window.loadDashboard = loadDashboard;

// Class Selection Handlers
$(document).on("click", ".class-card", function() {
    $(".class-card").css({
        "border-color": "var(--gold-dark)",
        "box-shadow": "none",
        "transform": "none",
        "background": "var(--card-bg)"
    }).removeClass("selected");

    $(this).css({
        "border-color": "var(--gold)",
        "box-shadow": "var(--shadow-gold)",
        "transform": "translate(-4px, -4px)",
        "background": "rgba(45,0,79,0.9)"
    }).addClass("selected");

    $("#confirm-class-btn").prop("disabled", false);
});

$("#confirm-class-btn").click(function() {
    const selectedCard = $(".class-card.selected");
    if (selectedCard.length === 0) return;

    const chosenClass = selectedCard.data("class");
    const chosenAvatar = selectedCard.data("avatar");
    const playerName = window.originalPlayerName || "Hero"; 

    const btn = $(this);
    btn.text("JOURNEY BEGINS...").prop("disabled", true);

    const response = window.db.updateProfile({
        name: playerName,
        class: chosenClass,
        avatar: chosenAvatar
    });

    if (response.status === 'success') {
        $("#class-modal-overlay").fadeOut(300, function() {
            $(this).removeClass("open");
            $("body").css("overflow", "auto");
            loadDashboard(); // Refresh to show new class
        });
    } else {
        alert(response.message || "Failed to choose class");
        btn.text("BEGIN JOURNEY").prop("disabled", false);
    }
});

function escapeHtml(unsafe) {
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
