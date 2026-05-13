let currentFilter = 'active';
let currentCategory = 'all';
let currentSort = 'newest';
let currentSearch = '';

$(document).ready(function() {
    loadNav();
    loadQuests();

    // Dropdown Toggles
    $(".dropdown-trigger").on("click", function(e) {
        e.stopPropagation();
        const target = $(this).attr("id") === 'status-trigger' ? "#status-dropdown" : "#category-dropdown";
        $(".pixel-dropdown-content").not(target).removeClass("show");
        $(target).toggleClass("show");
    });

    $(document).on("click", function() {
        $(".pixel-dropdown-content").removeClass("show");
    });

    // Filters
    $(".state-filter").on("click", function(e) {
        e.preventDefault();
        $(".state-filter").removeClass("active");
        $(this).addClass("active");
        currentFilter = $(this).data("filter");
        $("#status-trigger").text("⚔️ STATUS: " + $(this).text().replace('⚔️ ', '').replace('✓ ', '').replace('📜 ', ''));
        loadQuests();
    });

    $(".cat-filter").on("click", function(e) {
        e.preventDefault();
        $(".cat-filter").removeClass("active");
        $(this).addClass("active");
        currentCategory = $(this).data("cat");
        $("#category-trigger").text("🎯 CAT: " + $(this).text().replace('🎯 ', '').replace('💼 ', '').replace('💪 ', '').replace('📚 ', '').replace('🧘 ', '').replace('💰 ', '').replace('🤝 ', ''));
        loadQuests();
    });

    $("#sort-select").on("change", function() {
        currentSort = $(this).val();
        loadQuests();
    });

    $("#search-form").on("submit", function(e) {
        e.preventDefault();
        currentSearch = $("#search-input").val();
        loadQuests();
    });

    // Show Quest Detail
    $(document).on("click", ".quest-item", function(e) {
        // Don't trigger if clicking buttons
        if ($(e.target).closest('button, .quest-checkbox, a').length) return;
        
        const id = $(this).find('.complete-quest-btn').data('id') || $(this).find('.edit-quest-btn').data('id') || $(this).find('.delete-quest-btn').data('id');
        if (id) showQuestDetails(id);
    });

    // Toggle reward fields
    $("#add-with-reward").on("change", function() {
        if($(this).is(":checked")) {
            $("#reward-fields").slideDown();
        } else {
            $("#reward-fields").slideUp();
        }
    });

    // Add/Edit Quest
    $("#add-quest-form").on("submit", function(e) {
        e.preventDefault();
        let id = $("#edit-id").val();
        let action = id ? 'editQuest' : 'addQuest';
        
        let title = $("#add-title").val();
        let desc = $("#add-desc").val();
        let cat = $("#add-category").val();
        let diff = $("#add-difficulty").val();
        let prio = $("#add-priority").val();
        let startDate = $("#add-start-date").val();
        let dueDate = $("#add-due-date").val();

        // Reward data
        let withReward = $("#add-with-reward").is(":checked");
        let rewardCost = Math.max(0, Math.min(5, parseInt($("#reward-cost").val()) || 0));
        let rewardIcon = $("#reward-icon").val();
        let rewardDesc = $("#reward-desc").val() || '';

        // Handle "Specify" custom icon
        if (rewardIcon === 'specify') {
            rewardIcon = $("#custom-icon-emoji").val() || '🎁';
        }

        let res;
        if (id) {
            res = window.db.updateQuest(id, {
                title: title,
                description: desc,
                category: cat,
                difficulty: diff,
                priority: prio,
                start_date: startDate,
                due_date: dueDate
            });
        } else {
            res = window.db.addQuest({
                title: title,
                description: desc,
                category: cat,
                difficulty: diff,
                priority: prio,
                start_date: startDate,
                due_date: dueDate
            });
        }

        if(res.status === 'success') {
            let msg = id ? "📜 QUEST UPDATED: " + title : "📜 NEW QUEST ADDED: " + title;
            
            // If creating with reward and it's a NEW quest
            if(withReward && !id) {
                const newQuestId = res.quest ? res.quest.id : null;
                const rewardRes = window.db.addReward({
                    quest_id: newQuestId,
                    title: title,
                    cost: rewardCost,
                    icon: rewardIcon,
                    description: rewardDesc || "Reward for completing: " + title
                });
                if(rewardRes.status === 'success') {
                    msg += " (🎁 Reward Created!)";
                }
            }
            finalizeQuest(msg);
        } else {
            showMessage('error', res.message || "Failed to process quest.");
        }
    });

    function finalizeQuest(msg) {
        showMessage('success', msg);
        $("#add-quest-form")[0].reset();
        $("#edit-id").val('');
        $("#reward-fields").hide();
        if($("#add-panel").is(":visible")) toggleAdd();
        loadQuests();
    }
    
    // Pause Quest Button
    $(document).on("click", ".pause-quest-btn", function(e) {
        e.preventDefault();
        const id = $(this).data("id");
        const due = $(this).data("due");
        $("#delay-quest-id").val(id);
        $("#delay-due-date").val(due);
        $("#delay-modal").fadeIn();
    });

    // Delay Form Submit
    $("#delay-form").on("submit", function(e) {
        e.preventDefault();
        const id = $("#delay-quest-id").val();
        const dueDate = $("#delay-due-date").val();

        const res = window.db.updateQuest(id, { due_date: dueDate, is_paused: 1 });
        if(res.status === 'success') {
            showMessage('warning', "⏸️ QUEST PAUSED: Deadline extended.");
            $("#delay-modal").fadeOut();
            loadQuests();
            loadNav();
        }
    });

    // Resume Quest Button
    $(document).on("click", ".resume-quest-btn", function(e) {
        e.preventDefault();
        const id = $(this).data("id");
        const res = window.db.updateQuest(id, { is_paused: 0 });
        if(res.status === 'success') {
            showMessage('success', "▶️ QUEST RESUMED!");
            loadQuests();
        }
    });

    // Edit Quest Button
    $(document).on("click", ".edit-quest-btn", function(e) {
        e.preventDefault();
        let id = $(this).data("id");
        const q = window.db.getQuest(id);
        if(q) {
            $("#edit-id").val(q.id);
            $("#add-title").val(q.title);
            $("#add-desc").val(q.description);
            $("#add-category").val(q.category);
            $("#add-difficulty").val(q.difficulty);
            $("#add-priority").val(q.priority);
            $("#add-start-date").val(q.start_date);
            $("#add-due-date").val(q.due_date);
            
            $("#form-title").text("✎ EDIT QUEST");
            $("#form-submit").text("⚔️ UPDATE QUEST");
            
            if(!$("#add-panel").is(":visible")) {
                toggleAdd();
            }
            $('html, body').animate({ scrollTop: $("#add-panel").offset().top - 100 }, 500);
        }
    });

    // Complete Quest
    $(document).on("click", ".complete-quest-btn", function(e) {
        e.preventDefault();
        let id = $(this).data("id");
        const res = window.db.completeQuest(id);
        if(res.status === 'success') {
            playChime();
            showMessage('success', "✓ QUEST COMPLETE! +" + res.xp_earned + " XP");
            loadNav(); // update xp and gold
            loadQuests();

            if(res.new_achievements && res.new_achievements.length > 0) {
                let delay = 500;
                res.new_achievements.forEach(a => {
                    setTimeout(() => showToast(a.icon, a.title, a.description), delay);
                    delay += 4500;
                });
            } else {
                showToast('⚔️', 'QUEST COMPLETE', 'You have earned XP and Gold!');
            }
        } else {
            showMessage('error', res.message || "Failed to complete.");
        }
    });

    // Delete Quest
    $(document).on("click", ".delete-quest-btn", function(e) {
        e.preventDefault();
        if(confirm('Abandon this quest?')) {
            let id = $(this).data("id");
            const res = window.db.deleteQuest(id);
            if(res.status === 'success') {
                showMessage('warning', "Quest abandoned.");
                loadQuests();
            } else {
                showMessage('error', res.message || "Failed to delete.");
            }
        }
    });

    // Expose globals for HTML onclicks
    window.toggleAdd = toggleAdd;
    window.showQuestDetails = showQuestDetails;
    window.completeQuestFromModal = completeQuestFromModal;
    window.toggleSpecifyIcon = toggleSpecifyIcon;

});

function toggleAdd() {
    if(!$("#add-panel").is(":visible")) {
        // Reset form to "New Quest" mode if it's not already editing
        if(!$("#edit-id").val()) {
            $("#form-title").text("⚔️ NEW QUEST");
            $("#form-submit").text("⚔️ ADD QUEST");
            $("#add-quest-form")[0].reset();
        }
    } else {
        $("#edit-id").val('');
    }
    $("#add-panel").slideToggle();
}

function toggleSpecifyIcon(selectEl) {
    if ($(selectEl).val() === 'specify') {
        $("#specify-icon-fields").slideDown();
    } else {
        $("#specify-icon-fields").slideUp();
    }
}

function showMessage(type, text) {
    let color = type === 'success' ? 'var(--accent-green)' : (type === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)');
    $("#system-message").css('border-color', color).show();
    $("#system-message-text").css('color', color).text(text);
    setTimeout(() => {
        $("#system-message").fadeOut();
    }, 4000);
}

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

function loadQuests() {
    $("#quest-list-container").html("<div style=\"text-align:center;padding:60px;color:var(--text-dim);font-family:'VT323';font-size:24px;\">Loading quests...</div>");
    
    const quests = window.db.getQuests({
        filter: currentFilter,
        category: currentCategory,
        sort: currentSort,
        search: currentSearch
    });
    renderQuests(quests);
}

function renderQuests(quests) {
    if(quests.length === 0) {
        let msg = currentFilter === 'completed' ? "You haven't completed any quests yet!" : "The quest board is empty. Add your first quest!";
        $("#quest-list-container").html(`
            <div class="pixel-panel" style="text-align:center;padding:60px 40px;">
                <div style="font-size:60px;margin-bottom:20px;">📜</div>
                <h2 class="pixel-title" style="font-size:14px;margin-bottom:12px;">NO QUESTS FOUND</h2>
                <p style="font-family:'VT323';font-size:18px;color:var(--text-dim);margin-bottom:24px;">${msg}</p>
                <button class="btn-pixel btn-pixel-gold btn-lg" onclick="toggleAdd()">➕ CREATE YOUR FIRST QUEST</button>
            </div>
        `);
        return;
    }

    const catColors = { 'work':'var(--accent-cyan)', 'health':'var(--accent-green)', 'personal':'var(--purple-glow)', 'learning':'var(--gold)', 'finance':'var(--accent-orange)', 'social':'var(--accent-red)' };
    const catIcons = { 'work':'💼', 'health':'💪', 'personal':'🧘', 'learning':'📚', 'finance':'💰', 'social':'🤝' };
    const diffColors = { 'easy':'var(--accent-green)', 'medium':'var(--accent-cyan)', 'hard':'var(--accent-red)', 'legendary':'var(--accent-orange)' };
    const prioColors = { 'urgent':'var(--accent-red)', 'high':'var(--accent-orange)', 'normal':'var(--gold-dark)', 'low':'#3a006a' };

    let html = `<div id="quest-list">`;

    quests.forEach(q => {
        let catColor = catColors[q.category] || 'var(--gold)';
        let catIcon = catIcons[q.category] || '🎯';
        let diffColor = diffColors[q.difficulty] || 'var(--gold)';
        let prioColor = prioColors[q.priority] || 'var(--gold-dark)';
        
        let completed = parseInt(q.completed) === 1;
        let compClass = completed ? 'completed' : '';
        let prioClass = `priority-${q.priority}`;
        
        // Check if quest is inactive or paused
        let isPaused = parseInt(q.is_paused) === 1;
        let isInactive = false;
        let stateLabel = '';
        
        if(!completed) {
            if(isPaused) {
                compClass += ' paused';
                stateLabel = `<span style="color:var(--accent-cyan);">⏸️ PAUSED</span>`;
            } else if(q.due_date) {
                let today = new Date();
                today.setHours(0, 0, 0, 0);
                let dueDate = new Date(q.due_date);
                dueDate.setHours(0, 0, 0, 0);
                if(today > dueDate) {
                    isInactive = true;
                    compClass += ' inactive';
                    stateLabel = `<span style="color:var(--accent-red);">⛔ OVERDUE (-10G/DAY)</span>`;
                }
            }
        }

        let checkBtn = '';
        let controls = '';

        if(!completed) {
            checkBtn = `
                <button type="button" class="quest-checkbox complete-quest-btn" data-id="${q.id}" title="Mark Complete" style="background:none;cursor:pointer;">
                    <span style="font-size:12px;color:var(--gold);">○</span>
                </button>
            `;
            let pauseBtn = isPaused 
                ? `<button type="button" class="btn-pixel btn-pixel-outline btn-sm resume-quest-btn" data-id="${q.id}" title="Resume Quest">▶️</button>`
                : `<button type="button" class="btn-pixel btn-pixel-outline btn-sm pause-quest-btn" data-id="${q.id}" data-due="${q.due_date}" title="Pause Quest">⏸️</button>`;

            controls = `
                <div style="display:flex; gap:6px;">
                    ${pauseBtn}
                    <button type="button" class="btn-pixel btn-pixel-purple btn-sm edit-quest-btn" data-id="${q.id}">✎</button>
                    <button type="button" class="btn-pixel btn-pixel-red btn-sm delete-quest-btn" data-id="${q.id}">✕</button>
                </div>
            `;
        } else {
            checkBtn = `<div class="quest-checkbox checked">✓</div>`;
            if(q.completed_at) {
                let cd = new Date(q.completed_at);
                controls = `<div style="font-size:7px;color:var(--accent-green);">✓ ${cd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`;
            }
        }

        let descHtml = '';
        if(q.description) {
            let trunc = q.description.length > 80 ? q.description.substring(0, 80) + '...' : q.description;
            descHtml = `<div style="font-family:'VT323';font-size:15px;color:var(--text-dim);margin-top:4px;">${escapeHtml(trunc)}</div>`;
        }

        let urgentLabel = q.priority === 'urgent' ? `<span style="color:var(--accent-red);">🔴 URGENT</span>` : '';
        let highLabel = q.priority === 'high' ? `<span style="color:var(--accent-orange);">🟠 HIGH</span>` : '';
        
        // Format date range
        let dateRangeStr = '';
        if(q.start_date || q.due_date) {
            let startStr = q.start_date ? new Date(q.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
            let dueStr = q.due_date ? new Date(q.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
            dateRangeStr = `<div style="font-size:7px;color:var(--text-dim);">${startStr} → ${dueStr}</div>`;
        } else {
            let cd = new Date(q.created_at);
            dateRangeStr = `<div style="font-size:7px;color:var(--text-dim);">${cd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>`;
        }

        html += `
            <div class="quest-item ${prioClass} ${compClass}" style="border-left-color:${prioColor} !important;margin-bottom:8px;">
                ${checkBtn}
                <div class="cat-dot" style="background:${catColor};margin-top:6px;flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                    <div class="quest-title">${escapeHtml(q.title)}</div>
                    ${descHtml}
                    <div class="quest-meta" style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                        <span>${catIcon} ${q.category.toUpperCase()}</span>
                        <span style="color:${diffColor};">◆ ${q.difficulty.toUpperCase()}</span>
                        <span style="color:var(--gold);">+${q.xp_reward}XP</span>
                        <span style="color:var(--gold);">+${q.gold_reward}G</span>
                        ${urgentLabel}
                        ${highLabel}
                        ${stateLabel}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                    ${dateRangeStr}
                    ${controls}
                </div>
            </div>
        `;
    });

    html += `</div>
        <div style="margin-top:16px;font-family:'VT323';font-size:18px;color:var(--text-dim);">
            Showing ${quests.length} quest${quests.length !== 1 ? 's' : ''}
        </div>
    `;
    
    $("#quest-list-container").html(html);
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

function showQuestDetails(id) {
    const q = window.db.getQuest(id);
    if(q) {
        const catIcons = { 'work':'💼', 'health':'💪', 'personal':'🧘', 'learning':'📚', 'finance':'💰', 'social':'🤝' };
        const diffColors = { 'easy':'var(--accent-green)', 'medium':'var(--accent-cyan)', 'hard':'var(--accent-red)', 'legendary':'var(--accent-orange)' };
        
        const html = `
            <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px;border-bottom:2px solid var(--gold-dark);padding-bottom:15px;">
                <span style="font-size:32px;">${catIcons[q.category] || '🎯'}</span>
                <div style="flex:1;">
                    <h2 class="pixel-title" style="font-size:16px;margin:0;">${escapeHtml(q.title)}</h2>
                    <div style="font-size:8px;color:${diffColors[q.difficulty]};margin-top:5px;">RANK: ${q.difficulty.toUpperCase()}</div>
                </div>
            </div>
            
            <div style="font-family:'VT323';font-size:18px;color:var(--text-main);line-height:1.6;margin-bottom:25px;background:rgba(0,0,0,0.2);padding:15px;border:1px solid rgba(255,215,0,0.1);">
                ${q.description ? escapeHtml(q.description) : '<i>No description provided for this quest.</i>'}
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;">
                <div style="background:var(--purple-deep);padding:12px;border:2px solid var(--gold-dark);">
                    <div style="font-size:7px;color:var(--gold);margin-bottom:8px;">REWARDS</div>
                    <div style="font-family:'VT323';font-size:16px;color:var(--text-main);">✨ +${q.xp_reward} XP</div>
                    <div style="font-family:'VT323';font-size:16px;color:var(--gold);">💰 +${q.gold_reward}G</div>
                </div>
                <div style="background:var(--purple-deep);padding:12px;border:2px solid var(--gold-dark);">
                    <div style="font-size:7px;color:var(--gold);margin-bottom:8px;">DATES</div>
                    <div style="font-family:'VT323';font-size:16px;color:var(--text-dim);">START: ${q.start_date || 'N/A'}</div>
                    <div style="font-family:'VT323';font-size:16px;color:var(--accent-red);">DUE: ${q.due_date || 'N/A'}</div>
                </div>
            </div>
            
            <div style="display:flex;gap:12px;">
                ${parseInt(q.completed) === 0 ? `<button onclick="completeQuestFromModal(${q.id})" class="btn-pixel btn-pixel-gold" style="flex:1;">⚔️ COMPLETE QUEST</button>` : ''}
                <button onclick="$('#quest-detail-modal').fadeOut()" class="btn-pixel btn-pixel-outline">CLOSE</button>
            </div>
        `;
        $("#quest-detail-content").html(html);
        $("#quest-detail-modal").fadeIn();
    }
}

function completeQuestFromModal(id) {
    $("#quest-detail-modal").fadeOut();
    const res = window.db.completeQuest(id);
    if(res.status === 'success') {
        showMessage('success', "✓ QUEST COMPLETE! +" + res.xp_earned + " XP");
        loadNav();
        loadQuests();
        
        if(res.new_achievements && res.new_achievements.length > 0) {
            let delay = 500;
            res.new_achievements.forEach(a => {
                setTimeout(() => showToast(a.icon, a.title, a.description), delay);
                delay += 4500;
            });
        } else {
            showToast('⚔️', 'QUEST COMPLETE', 'You have earned XP and Gold!');
        }
    } else {
        showMessage('error', res.message || "Failed to complete.");
    }
}

function showToast(icon, title, desc) {
    const t = document.getElementById('achievement-toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-desc').textContent = desc;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 4000);
}
