$(document).ready(function() {
    loadCharacterData();

    // Generate avatars
    const avatars = ['⚔️','🧙','🗡️','🛡️','🏹','🔮','📚','⚡','🌙','🔥','❄️','🌿','💀','👁️','🌟','🦅'];
    let avHtml = '';
    avatars.forEach(av => {
        avHtml += `<div class="avatar-opt" data-av="${av}">${av}</div>`;
    });
    $("#avatarGrid").html(avHtml);

    // Avatar select
    $(document).on("click", ".avatar-opt", function() {
        $(".avatar-opt").removeClass("selected");
        $(this).addClass("selected");
        const av = $(this).data("av");
        $("#edit-avatar").val(av);
        console.log("Avatar selected:", av);
    });

    // Profile submit
    $("#profile-form").on("submit", function(e) {
        e.preventDefault();
        let name = $("#edit-name").val();
        let cls = $("#edit-class").val();
        let av = $("#edit-avatar").val();

        console.log("Updating profile:", { name, class: cls, avatar: av });

        const res = window.db.updateProfile({
            name: name,
            class: cls,
            avatar: av
        });

        if(res.status === 'success') {
            showMessage('success', "✓ CHARACTER UPDATED!", "#character-message");
            loadCharacterData();
        } else {
            showMessage('error', res.message || "Failed to update profile.", "#character-message");
        }
    });
});

function loadCharacterData() {
    const res = window.db.getCharacterData();
    if(res.status === 'success') {
        const p = res.player;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;
        const stats = res.stats;

        // Nav
        $("#nav-level").text(`LV${p.level}`);
        $("#nav-name").text(p.name.toUpperCase());
        $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
        $("#nav-xp-fill").css("width", `${xpPct}%`);
        $("#nav-gold").text(`💰 ${res.gold}G`);

        // Left Card
        $("#char-avatar").text(p.avatar);
        $("#char-name").text(p.name);
        $("#char-class").text(p.class.toUpperCase());
        $("#char-level").text(`LV ${p.level}`);
        
        $("#char-xp-text").text(`${p.xp}/${p.xp_next}`);
        $("#char-xp-fill").css("width", `${xpPct}%`);
        $("#char-xp-pct").text(`${xpPct}%`);
        
        $("#stat-val-hp").text(stats.hp);
        $("#stat-bar-hp").css("width", `${Math.min(100, Math.round(stats.hp/999*100))}%`);
        
        $("#stat-val-mp").text(stats.mp);
        $("#stat-bar-mp").css("width", `${Math.min(100, Math.round(stats.mp/999*100))}%`);
        
        $("#stat-val-str").text(stats.str);
        $("#stat-bar-str").css("width", `${stats.str}%`);
        
        $("#stat-val-int").text(stats.intel);
        $("#stat-bar-int").css("width", `${stats.intel}%`);

        $("#char-quests-done").text(res.totalDone);
        $("#char-gold").text(new Intl.NumberFormat().format(res.gold));

        // Weapon Display
        const equipped = p.equipped_weapon || 'common';
        const weaponData = {
            'common': { name: 'BASIC WEAPON', icon: '⚔️', bonus: '0%' },
            'uncommon': { name: 'UNCOMMON WEAPON', icon: '✨', bonus: '10%' },
            'rare': { name: 'RARE WEAPON', icon: '🔷', bonus: '25%' },
            'epic': { name: 'EPIC WEAPON', icon: '💜', bonus: '50%' },
            'legendary': { name: 'LEGENDARY WEAPON', icon: '🔥', bonus: '100%' },
            'mythic': { name: 'MYTHIC WEAPON', icon: '🔱', bonus: '200%' },
            'divine': { name: 'DIVINE WEAPON', icon: '☀️', bonus: '500%' }
        };
        const w = weaponData[equipped] || weaponData['common'];
        $("#char-weapon-icon").text(w.icon);
        $("#char-weapon-name").text(w.name);
        $("#char-weapon-bonus").text(`+${w.bonus} GOLD BONUS`);

        // Form Defaults
        $("#edit-name").val(p.name);
        $("#edit-class").val(p.class);
        $("#edit-avatar").val(p.avatar);
        $(".avatar-opt").removeClass("selected");
        $(".avatar-opt").each(function() {
            if($(this).data('av') === p.avatar) $(this).addClass("selected");
        });

        // Milestones
        let mh = '';
        const milestones = {1:'🌱 Novice', 5:'⚔️ Swordsman', 10:'🌟 Champion', 15:'💎 Master', 20:'👑 Legend', 25:'🔮 Mythic'};
        Object.keys(milestones).forEach(key => {
            let lv = parseInt(key);
            let title = milestones[key];
            let done = p.level >= lv;
            
            let bg = done ? 'var(--gold)' : 'var(--purple-dark)';
            let border = done ? 'var(--gold)' : '#3a006a';
            let color = done ? '#000' : 'var(--text-dim)';
            let textCol = done ? 'var(--gold)' : 'var(--text-dim)';
            
            let curBadge = p.level == lv ? `<span class="pixel-badge badge-green blink-anim" style="margin-left:auto;font-size:7px;">CURRENT</span>` : '';
            let check = (done && p.level > lv) ? `<span style="margin-left:auto;color:var(--accent-green);font-size:10px;">✓</span>` : '';

            mh += `
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,215,0,0.1);">
                    <div style="width:30px;height:30px;background:${bg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:10px;color:${color};">
                        ${lv}
                    </div>
                    <span style="font-family:'VT323';font-size:18px;color:${textCol};">${title}</span>
                    ${curBadge}
                    ${check}
                </div>
            `;
        });
        $("#milestones-container").html(mh);

        // Recent Achievements
        let ah = '';
        if(res.recentAchievements.length > 0) {
            res.recentAchievements.forEach(a => {
                let rc = getRarityClass(a.rarity);
                ah += `
                    <div style="display:flex;align-items:center;gap:12px;padding:10px;border:2px solid var(--gold-dark);margin-bottom:8px;background:var(--card-bg);">
                        <span style="font-size:24px;">${a.icon}</span>
                        <div style="flex:1;">
                            <div style="font-size:8px;color:var(--gold);">${escapeHtml(a.title)}</div>
                            <div style="font-family:'VT323';font-size:14px;color:var(--text-dim);">${escapeHtml(a.description)}</div>
                        </div>
                        <span class="pixel-badge ${rc}">${a.rarity.toUpperCase()}</span>
                    </div>
                `;
            });
        } else {
            ah = `<div style="text-align:center;padding:24px;font-family:'VT323';font-size:18px;color:var(--text-dim);">Complete quests to earn achievements!</div>`;
        }
        $("#recent-ach-container").html(ah);
    }
}

function showMessage(type, text, container = "#system-message") {
    let color = type === 'success' ? 'var(--accent-green)' : (type === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)');
    const $msg = $(container);
    const $text = $(container + "-text");
    
    $msg.css('border-color', color).stop(true, true).fadeIn();
    $text.css('color', color).text(text);
    
    setTimeout(() => {
        $msg.fadeOut();
    }, 4000);
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
