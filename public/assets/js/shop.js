$(document).ready(function() {
    loadShop();
});

function loadShop() {
    const res = window.db.getCharacterData();
    if(res.status === 'success') {
        const p = res.player;
        const gold = res.gold;
        const xpPct = p.xp_next > 0 ? Math.round((p.xp / p.xp_next) * 100) : 0;

        $("#nav-level").text(`LV${p.level}`);
        $("#nav-name").text(p.name.toUpperCase());
        $("#nav-xp-text").text(`${p.xp}/${p.xp_next} XP`);
        $("#nav-xp-fill").css("width", `${xpPct}%`);
        $("#nav-gold").text(`💰 ${gold}G`);
        $("#shop-gold-display").text(`💰 ${new Intl.NumberFormat().format(gold)}G`);

        renderXPItems(gold);
        renderWeaponShop(gold, p);
    }
}

function renderXPItems(playerGold) {
    const xpItems = [
        {key:'xp_boost', icon:'📜', name:'XP Scroll', desc:'A basic scroll enchanted with experience magic.', cost:50, gain:'+100 XP'},
        {key:'xp_mega', icon:'📚', name:'Mega XP Tome', desc:'An ancient tome bursting with knowledge and power.', cost:150, gain:'+300 XP'},
        {key:'xp_legend', icon:'🔮', name:'Legendary Scroll', desc:'A mythical artifact of incredible power.', cost:400, gain:'+1000 XP'},
    ];

    let html = '';
    xpItems.forEach(item => {
        const canAfford = playerGold >= item.cost;
        const btnHtml = canAfford 
            ? `<button onclick="buyItem('${item.key}')" class="btn-pixel btn-pixel-gold" style="width:100%;">⚔️ BUY ${item.cost}G</button>`
            : `<button class="btn-pixel btn-pixel-outline" disabled style="width:100%;opacity:0.4;cursor:not-allowed;">💰 BUY ${item.cost}G</button>`;

        html += `
            <div class="shop-item pixel-card" style="padding:10px; text-align:center;">
                <span class="shop-icon" style="font-size:24px; margin-bottom:4px;">${item.icon}</span>
                <div style="font-size:7px; color:var(--gold); margin-bottom:4px; height:20px; overflow:hidden;">${item.name}</div>
                <div class="pixel-badge badge-green" style="font-size:6px; padding:2px 4px; margin-bottom:6px;">${item.gain}</div>
                <div class="shop-price" style="font-size:8px; margin-bottom:8px;">💰 ${new Intl.NumberFormat().format(item.cost)}G</div>
                ${btnHtml}
            </div>
        `;
    });
    $("#xp-items-container").addClass("grid-mobile-3").html(html);
}

function renderWeaponShop(playerGold, player) {
    const pClass = player.class || 'Swordsman';
    const equipped = player.equipped_weapon || 'common';
    const inventory = player.weapon_inventory || ['common'];

    const rarities = [
        {id:'uncommon', name:'Uncommon', cost:600, bonus:1, prev:'none'},
        {id:'rare', name:'Rare', cost:1500, bonus:5, prev:'uncommon'},
        {id:'epic', name:'Epic', cost:5000, bonus:10, prev:'rare'},
        {id:'legendary', name:'Legendary', cost:8000, bonus:15, prev:'epic'},
        {id:'mythic', name:'Mythic', cost:12000, bonus:25, prev:'legendary'},
        {id:'divine', name:'Divine', cost:20000, bonus:50, prev:'mythic'},
    ];

    const weaponMap = {
        'Swordsman': {
            'uncommon': {name:'Grand Knight Sword', file:'Swordsman_Grand_Knight_Sword.png'},
            'rare': {name:'Crystal Sword', file:'Swordsman_Crystal_Sword.png'},
            'epic': {name:'Wrath of the Sky', file:'Swordsman_Wrath_of_the_Sky.png'},
            'legendary': {name:'Slayer of the Nine Skies', file:'Swordsman_Slayer_of_the_Nine_Skies.png'},
            'mythic': {name:'Spatial Severance', file:'Swordsman_Spatial_Severance.png'},
            'divine': {name:'Genesis: Glaive of the Primordial Divine', file:'Swordsman_Genesis - Glaive of the Primordial Divine.png'}
        },
        'Paladin': {
            'uncommon': {name:'Sage of Light', file:'Paladin_Sage_of_Light.png'},
            'rare': {name:'Emblem', file:'Paladin_Emblem.png'},
            'epic': {name:'Holy Shield', file:'Paladin_Holy_Shield.png'},
            'legendary': {name:'Demon Slayer', file:'Paladin_Inheritance_of_the_Dark_King - Demon_Slayer.png'},
            'mythic': {name:'Celestial', file:'Paladin_Celestial.png'}
        },
        'Mage': {
            'uncommon': {name:'Frost Wand', file:'Mage_Frost_Wand.png'},
            'rare': {name:'War Magic', file:'Mage_War_Magic.png'},
            'epic': {name:'Ember Staff', file:'Mage_Ember_Staff.png'},
            'legendary': {name:'Origin of Jade', file:'Mage_Origin_of_Jade.png'},
            'mythic': {name:'Conqueror of the Cosmic', file:'Mage_Conqueror_of_the_Cosmic.png'},
            'divine': {name:'Astras of Eternity', file:'Mage_Astras_of_Eternity.png'}
        },
        'Sage': {
            'uncommon': {name:'Golden Staff', file:'Sage_Golden_Staff.png'},
            'rare': {name:'Staff of Light', file:'Sage_Staff_of_Light.png'},
            'epic': {name:'Saint Cross', file:'Sage_Saint_Cross.png'},
            'legendary': {name:'Underworld', file:'Sage_Underworld.png'},
            'mythic': {name:'Tome of the Holy One', file:'Sage_Tome_of_the_Holy_One.png'}
        },
        'Ranger': {
            'uncommon': {name:'Elven Bow', file:'Ranger_Elven_Bow.png'},
            'rare': {name:'Blizzard', file:'Ranger_Blizzard.png'},
            'epic': {name:'Photon Cyclone', file:'Ranger_Photon_Cyclone.png'},
            'legendary': {name:'Authority of Lightning', file:'Ranger_Authority_of_Lightning.png'},
            'mythic': {name:'Meteors', file:'Range_Meteors.png'},
            'divine': {name:'Transendent Tempest', file:'Ranger_Transcendent_Tempest.png'}
        },
        'Rogue': {
            'uncommon': {name:'Sound', file:'Rogue_Sound.png'},
            'rare': {name:'Whisper of Death', file:'Rogue_Whisper_of_Death.png'},
            'epic': {name:'Electric Phantom', file:'Rogue_Electric_Phantom.png'},
            'legendary': {name:'Rain of Mirage', file:'Rogue_Rain_of_Mirage_Void_Tooth.png'},
            'mythic': {name:'Umbral Shard', file:'Rogue_Umbral Shard.png'}
        },
        'Berserker': {
            'uncommon': {name:'Berserk', file:'Berserker_Berserk.png'},
            'rare': {name:'Dwarven Heirloom', file:'Berserker_Dwarven_Heirloom.png'},
            'epic': {name:'Axe of Volcanic Age', file:'Berserker_Axe_of_Volcanic_Age.png'},
            'legendary': {name:'North Vein', file:'Berserker_North_Vein.png'},
            'mythic': {name:'Asgard Thunder', file:'Berseker_Asgard_Thunder.png'}
        },
        'Trickster': {
            'uncommon': {name:'Code', file:'Trickster_Code.png'},
            'rare': {name:'Cloak of Deception', file:'Trickster_Cloak_of_Deception.png'},
            'epic': {name:'Fate Bounded', file:'Trickster_Fate_Bounded.png'},
            'legendary': {name: 'Nightstalker Crown', file: 'Trickster_Nightstalker_Crown.png'},
            'mythic': {name:'Curse of the End', file:'Trickster_Curse_of_the_End.png'}
        }
    };

    let fullHtml = '';
    rarities.forEach(r => {
        const isDivine = r.id === 'divine';
        const gridStyle = isDivine ? 'display:flex; justify-content:center; flex-wrap:wrap; gap:20px;' : '';
        const gridClass = isDivine ? '' : 'grid-mobile-3';
        const rarityColor = getRarityColor(r.id);

        let rowHtml = `
            <div class="rarity-row" style="margin-bottom:24px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:2px solid ${rarityColor}33;padding-bottom:6px;">
                    <h3 class="pixel-title" style="font-size:10px;color:${rarityColor};margin:0;">${r.name.toUpperCase()}</h3>
                    <span style="font-family:'VT323';font-size:12px;color:var(--gold);">+${r.bonus}G BONUS</span>
                </div>
                <div class="${gridClass}" style="${gridStyle}">
        `;

        Object.keys(weaponMap).forEach(cls => {
            const weapon = weaponMap[cls][r.id];
            if (!weapon) return;

            const isClassMatch = cls === pClass;
            const isEquipped = equipped === r.id && isClassMatch;
            const isOwned = inventory.includes(r.id) && isClassMatch;
            const canAfford = playerGold >= r.cost;
            const canUnlock = checkCanUnlock(inventory, r.prev) && isClassMatch;

            let statusHtml = '';
            let cardStyle = '';
            
            const imgSize = isDivine ? '100px' : '40px';
            const containerHeight = isDivine ? '110px' : '50px';
            let imgStyle = `max-height:${imgSize}; max-width:${imgSize}; filter: drop-shadow(0 0 12px ${rarityColor}88);`;

            if (!isClassMatch) {
                statusHtml = `<button class="btn-pixel btn-pixel-outline" disabled style="width:100%;opacity:0.3;font-size:6px;cursor:not-allowed;padding:4px;">🚫 NO</button>`;
                cardStyle = 'opacity:0.4; filter:grayscale(1);';
            } else if (isEquipped) {
                statusHtml = `<div class="pixel-badge badge-green" style="width:100%;text-align:center;font-size:6px;padding:2px 0;">✓ WIELD</div>`;
                cardStyle = `border-color:var(--accent-green); box-shadow: 0 0 10px var(--accent-green)33;`;
            } else if (isOwned) {
                statusHtml = `<button onclick="equipWeapon('${r.id}')" class="btn-pixel btn-pixel-purple btn-sm" style="width:100%;font-size:7px;padding:6px 2px;">⚔️ EQUIP</button>`;
                cardStyle = `border-color:var(--purple-glow);`;
            } else if (!canUnlock && r.id !== 'uncommon') {
                statusHtml = `<button class="btn-pixel btn-pixel-outline" disabled style="width:100%;opacity:0.4;font-size:6px;cursor:not-allowed;padding:4px;">🔒 LOCK</button>`;
                cardStyle = 'opacity:0.6; filter:grayscale(0.5);';
            } else {
                if (isDivine && player.level < 200) {
                    statusHtml = `<button class="btn-pixel btn-pixel-outline btn-sm" disabled style="width:100%;opacity:0.5;font-size:6px;padding:4px;">🔒 LVL 200</button>`;
                } else if (canAfford) {
                    statusHtml = `<button onclick="buyWeapon('${r.id}')" class="btn-pixel btn-pixel-gold btn-sm" style="width:100%;font-size:7px;padding:6px 2px;">⚔️ BUY</button>`;
                } else {
                    statusHtml = `<button class="btn-pixel btn-pixel-outline btn-sm" disabled style="width:100%;opacity:0.4;cursor:not-allowed;font-size:6px;padding:4px;">💰 ${r.cost}</button>`;
                }
            }

            const itemStyle = isDivine ? 'width: 260px; flex-shrink: 0;' : 'padding:8px; text-align:center;';

            rowHtml += `
                <div class="shop-item pixel-card" style="${cardStyle} ${itemStyle}">
                    <div style="height:${containerHeight}; display:flex; align-items:center; justify-content:center; margin-bottom:6px;">
                        <img src="assets/img/weapon/${r.id}/${weapon.file}" class="float-anim" style="${imgStyle}" alt="${weapon.name}">
                    </div>
                    <div style="font-size:6px; color:var(--gold); margin-bottom:6px; min-height:18px; line-height:1.2;">${weapon.name.toUpperCase()}</div>
                    ${statusHtml}
                </div>
            `;
        });

        rowHtml += `</div></div>`;
        fullHtml += rowHtml;
    });

    $("#weapons-shop-container").html(fullHtml);
}

function buyItem(itemKey) {
    const res = window.db.buyItem(itemKey);
    if(res.status === 'success') {
        showMessage('success', res.message);
        loadShop();
    } else {
        showMessage('error', res.message);
    }
}
window.buyItem = buyItem;

function checkCanUnlock(inventory, prevRarity) {
    if (!prevRarity || prevRarity === 'none') return true;
    return inventory.includes(prevRarity);
}

function equipWeapon(rarity) {
    const res = window.db.equipWeapon(rarity);
    if(res.status === 'success') {
        showMessage('success', res.message);
        loadShop();
    } else {
        showMessage('error', res.message);
    }
}
window.equipWeapon = equipWeapon;

function getRarityColor(rarity) {
    switch(rarity) {
        case 'uncommon': return '#00FF88';
        case 'rare': return '#00FFFF';
        case 'epic': return '#CC44FF';
        case 'legendary': return '#FFD700';
        case 'mythic': return '#FF2244';
        case 'divine': return '#FFFFFF';
        default: return '#AA88CC';
    }
}

function buyWeapon(rarity) {
    const res = window.db.buyWeapon(rarity);
    if(res.status === 'success') {
        showMessage('success', res.message);
        loadShop();
    } else {
        showMessage('error', res.message);
    }
}
window.buyWeapon = buyWeapon;

function showMessage(type, text) {
    let color = type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)';
    $("#system-message").css('border-color', color).show();
    $("#system-message-text").css('color', color).text(text);
    setTimeout(() => { $("#system-message").fadeOut(); }, 4000);
}

function showToast(icon, title, desc) {
    const t = document.getElementById('achievement-toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-desc').textContent = desc;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}


