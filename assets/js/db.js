import { cloudSync } from './firebase.js';

const DB_KEYS = {
    PLAYER: 'ql_player',
    QUESTS: 'ql_quests',
    ACHIEVEMENTS: 'ql_achievements',
    REWARDS: 'ql_rewards',
    LOGS: 'ql_logs'
};

// Initial Data
const INITIAL_PLAYER = {
    name: 'Hero',
    class: 'Swordsman',
    level: 1,
    xp: 0,
    xp_next: 100,
    gold: 50,
    class_locked: 0, 
    avatar: '⚔️',
    weapon_inventory: ['common'],
    equipped_weapon: 'common'
};

const INITIAL_QUESTS = [];
const INITIAL_ACHIEVEMENTS = [
    { id: 'first_quest', title: 'First Blood', description: 'Complete your first quest', icon: '⚔️', type: 'milestone', rarity: 'common', reward: 50, cond_key: 'quests_total', cond_val: 1, unlocked: false },
    { id: 'quest_5', title: 'Battle Hardened', description: 'Complete 5 quests', icon: '🛡️', type: 'milestone', rarity: 'uncommon', reward: 100, cond_key: 'quests_total', cond_val: 5, unlocked: false },
    { id: 'quest_10', title: 'Veteran Warrior', description: 'Complete 10 quests', icon: '🏆', type: 'milestone', rarity: 'rare', reward: 200, cond_key: 'quests_total', cond_val: 10, unlocked: false },
    { id: 'quest_25', title: 'Quest Master', description: 'Complete 25 quests', icon: '👑', type: 'milestone', rarity: 'epic', reward: 400, cond_key: 'quests_total', cond_val: 25, unlocked: false },
    { id: 'quest_50', title: 'Legendary Hero', description: 'Complete 50 quests', icon: '🌟', type: 'milestone', rarity: 'legendary', reward: 1000, cond_key: 'quests_total', cond_val: 50, unlocked: false },
    { id: 'quest_100', title: 'Mythic Champion', description: 'Complete 100 quests', icon: '💎', type: 'milestone', rarity: 'mythic', reward: 2500, cond_key: 'quests_total', cond_val: 100, unlocked: false },
    { id: 'work_5', title: 'Office Knight', description: 'Complete 5 Work quests', icon: '💼', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_work', cond_val: 5, unlocked: false },
    { id: 'health_5', title: 'Iron Body', description: 'Complete 5 Health quests', icon: '💪', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_health', cond_val: 5, unlocked: false },
    { id: 'learning_5', title: 'Scholar', description: 'Complete 5 Learning quests', icon: '📚', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_learning', cond_val: 5, unlocked: false },
    { id: 'personal_5', title: 'Self Master', description: 'Complete 5 Personal quests', icon: '🧘', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_personal', cond_val: 5, unlocked: false },
    { id: 'finance_5', title: 'Gold Hoarder', description: 'Complete 5 Finance quests', icon: '💰', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_finance', cond_val: 5, unlocked: false },
    { id: 'social_5', title: 'People Champion', description: 'Complete 5 Social quests', icon: '🤝', type: 'category', rarity: 'uncommon', reward: 100, cond_key: 'cat_social', cond_val: 5, unlocked: false },
    { id: 'level_5', title: 'Rank Up', description: 'Reach Level 5', icon: '⭐', type: 'special', rarity: 'rare', reward: 300, cond_key: 'level', cond_val: 5, unlocked: false },
    { id: 'level_10', title: 'Legendary Rank', description: 'Reach Level 10', icon: '🌠', type: 'special', rarity: 'epic', reward: 750, cond_key: 'level', cond_val: 10, unlocked: false },
    { id: 'streak_3', title: 'On Fire', description: '3 day completion streak', icon: '🔥', type: 'special', rarity: 'rare', reward: 200, cond_key: 'streak', cond_val: 3, unlocked: false },
    { id: 'streak_7', title: 'Unstoppable', description: '7 day streak', icon: '⚡', type: 'special', rarity: 'epic', reward: 500, cond_key: 'streak', cond_val: 7, unlocked: false },
    { id: 'hard_quest', title: 'Challenge Seeker', description: 'Complete a Hard quest', icon: '💀', type: 'special', rarity: 'rare', reward: 150, cond_key: 'hard_quest', cond_val: 1, unlocked: false },
    { id: 'all_cats', title: 'Polymath', description: 'Complete quest in all 6 categories', icon: '🔮', type: 'special', rarity: 'legendary', reward: 800, cond_key: 'all_cats', cond_val: 6, unlocked: false }
];

export const db = {
    // Helper to get from LocalStorage
    get(key, defaultValue) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },

    // Helper to save to LocalStorage and Sync to Cloud
    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        this.triggerSync();
    },

    // Background sync to Firebase if logged in
    async triggerSync() {
        const userId = localStorage.getItem('ql_user_id');
        if (!userId) return;

        // Gather all data to sync (with safe defaults)
        const allData = {
            player: this.get(DB_KEYS.PLAYER, INITIAL_PLAYER),
            quests: this.get(DB_KEYS.QUESTS, []),
            achievements: this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS),
            rewards: this.get(DB_KEYS.REWARDS, [])
        };

        // Upload in background (don't await so UI stays fast)
        cloudSync.uploadData(userId, allData);
    },

    // Initialize the DB if empty
    init() {
        const currentUserId = localStorage.getItem('ql_user_id');
        const lastUserId = localStorage.getItem('ql_last_user_id');

        // If the user changed (or it's a new login), reset local data to prevent "ghost" data from previous users
        if (currentUserId && currentUserId !== lastUserId) {
            console.log("New Hero detected! Clearing local data for a fresh start.");
            this.resetProgress();
            localStorage.setItem('ql_last_user_id', currentUserId);
        }

        if (!localStorage.getItem(DB_KEYS.PLAYER)) {
            this.save(DB_KEYS.PLAYER, INITIAL_PLAYER);
        }
        if (!localStorage.getItem(DB_KEYS.QUESTS)) {
            this.save(DB_KEYS.QUESTS, INITIAL_QUESTS);
        }
        if (!localStorage.getItem(DB_KEYS.ACHIEVEMENTS)) {
            this.save(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        }
    },

    // Reset progress
    resetProgress() {
        Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
    },

    // Get Dashboard Data (Mocking response from controller.php)
    getDashboardData() {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);

        const stats = {
            totalCompleted: quests.filter(q => q.completed).length,
            totalPending: quests.filter(q => !q.completed).length,
            achUnlocked: achievements.filter(a => a.unlocked).length,
            achTotal: achievements.length,
            todayCompleted: 0 // Logic for today's wins can be added
        };

        return {
            status: 'success',
            player: player,
            gold: player.gold,
            stats: stats,
            recentQuests: quests.slice(-5).reverse(),
            recentAch: achievements.filter(a => a.unlocked).slice(-3),
            categories: [] // Category breakdown logic
        };
    },

    // Update Profile (Mocking action: updateProfile)
    updateProfile(data) {
        const p = this.get(DB_KEYS.PLAYER);
        
        // CLASS SWITCHING LOCK LOGIC
        if (data.class && data.class !== p.class && p.class_locked == 1) {
            // Check Achievements
            const achs = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
            const allUnlocked = achs.every(a => a.unlocked);
            
            // Check Mythic Weapon (Mocking check - usually stored in logs or a specific field)
            // For now, we'll check if they've spent enough gold or have a specific flag
            const hasMythic = p.has_mythic_weapon === true; 

            if (!allUnlocked || !hasMythic) {
                let reason = !allUnlocked ? "unlocked all achievements" : "purchased your Class Mythic Weapon";
                return { 
                    status: 'error', 
                    message: `🛡️ Path Locked! You must have ${reason} to switch classes.` 
                };
            }
        }

        const newPlayer = { ...p, ...data, class_locked: 1 };
        this.save(DB_KEYS.PLAYER, newPlayer);
        this.triggerSync();
        return { status: 'success', player: newPlayer };
    },

    // Get Character Data (detailed stats)
    getCharacterData() {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);

        // Simple Stat Calculation
        const level = player.level;
        const stats = {
            hp: 100 + (level * 20),
            mp: 50 + (level * 10),
            str: 5 + level,
            intel: 5 + level
        };

        // Class bonuses
        if (player.class === 'Swordsman') { stats.hp += 50; stats.str += 10; }
        else if (player.class === 'Mage') { stats.mp += 50; stats.intel += 10; }
        else if (player.class === 'Rogue') { stats.str += 5; stats.intel += 5; }

        return {
            status: 'success',
            player: player,
            gold: player.gold,
            stats: stats,
            totalDone: quests.filter(q => q.completed).length,
            recentAchievements: achievements.filter(a => a.unlocked).slice(-3)
        };
    },

    getStatsData() {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        const completed = quests.filter(q => q.completed);

        // Summary
        const summary = {
            totalDone: completed.length,
            totalXPEarned: completed.reduce((sum, q) => sum + (q.xp_reward || 0), 0),
            totalGoldEarned: completed.reduce((sum, q) => sum + (q.gold_reward || 0), 0),
            hardDone: completed.filter(q => q.difficulty === 'hard').length,
            legendaryDone: completed.filter(q => q.difficulty === 'legendary').length,
            achDone: achievements.filter(a => a.unlocked).length
        };

        // Last 7 Days
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const count = completed.filter(q => {
                const qDate = new Date(q.completed_at || q.created_at);
                return qDate.toDateString() === d.toDateString();
            }).length;
            last7.push({ date: dateStr, count: count });
        }

        // Category Data
        const catMap = {};
        completed.forEach(q => {
            catMap[q.category] = (catMap[q.category] || 0) + 1;
        });
        const catData = Object.keys(catMap).map(cat => ({ category: cat, cnt: catMap[cat] }));

        // Difficulty Data
        const diffData = {
            easy: completed.filter(q => q.difficulty === 'easy').length,
            medium: completed.filter(q => q.difficulty === 'medium').length,
            hard: completed.filter(q => q.difficulty === 'hard').length,
            legendary: completed.filter(q => q.difficulty === 'legendary').length
        };

        return {
            status: 'success',
            player: player,
            gold: player.gold,
            summary: summary,
            last7: last7,
            catData: catData,
            diffData: diffData
        };
    },

    getLeaderboardData() {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        const completed = quests.filter(q => q.completed);

        return {
            status: 'success',
            player: player,
            gold: player.gold,
            totalDone: completed.length,
            achDone: achievements.filter(a => a.unlocked).length,
            totalXP: completed.reduce((sum, q) => sum + (q.xp_reward || 0), 0)
        };
    },

    getDailyLogData() {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        const todayStr = new Date().toDateString();

        const todayQuests = quests.filter(q => q.completed && new Date(q.completed_at || q.created_at).toDateString() === todayStr);
        const pending = quests.filter(q => !q.completed);

        // 14-Day Heatmap
        const heatmap = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateISO = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const count = quests.filter(q => q.completed && new Date(q.completed_at || q.created_at).toDateString() === d.toDateString()).length;
            heatmap.push({ date: dateISO, label: label, count: count });
        }

        return {
            status: 'success',
            player: player,
            todayQuests: todayQuests,
            pending: pending,
            heatmap: heatmap
        };
    },

    // --- QUEST METHODS ---
    getQuests(params = {}) {
        let quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        
        // Filter by status
        if (params.filter === 'active') {
            quests = quests.filter(q => !q.completed);
        } else if (params.filter === 'completed') {
            quests = quests.filter(q => q.completed);
        }

        // Filter by category
        if (params.category && params.category !== 'all') {
            quests = quests.filter(q => q.category === params.category);
        }

        // Search
        if (params.search) {
            const s = params.search.toLowerCase();
            quests = quests.filter(q => q.title.toLowerCase().includes(s) || (q.description && q.description.toLowerCase().includes(s)));
        }

        // Sort
        if (params.sort === 'newest') {
            quests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (params.sort === 'oldest') {
            quests.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (params.sort === 'xp') {
            quests.sort((a, b) => b.xp_reward - a.xp_reward);
        }

        return quests;
    },

    getQuest(id) {
        const quests = this.get(DB_KEYS.QUESTS, INITIAL_QUESTS);
        return quests.find(q => q.id == id);
    },

    addQuest(questData) {
        const quests = this.getQuests();
        const newQuest = {
            id: Date.now(), // Simple unique ID
            title: questData.title,
            category: questData.category,
            difficulty: questData.difficulty,
            xp_reward: parseInt(questData.xp_reward) || 10,
            gold_reward: parseInt(questData.gold_reward) || 5,
            completed: false,
            created_at: new Date().toISOString()
        };
        quests.push(newQuest);
        this.save(DB_KEYS.QUESTS, quests);
        return { status: 'success', quest: newQuest };
    },

    updateQuest(id, updates) {
        const quests = this.getQuests();
        const index = quests.findIndex(q => q.id == id);
        if (index !== -1) {
            quests[index] = { ...quests[index], ...updates };
            this.save(DB_KEYS.QUESTS, quests);
            return { status: 'success' };
        }
        return { status: 'error', message: 'Quest not found' };
    },

    deleteQuest(id) {
        let quests = this.getQuests();
        quests = quests.filter(q => q.id != id);
        this.save(DB_KEYS.QUESTS, quests);

        // Auto-delete any linked reward
        let rewards = this.getRewards();
        rewards = rewards.filter(r => r.quest_id != id);
        this.save(DB_KEYS.REWARDS, rewards);

        return { status: 'success' };
    },

    completeQuest(id) {
        const quests = this.getQuests();
        const index = quests.findIndex(q => q.id == id);
        if (index !== -1 && !quests[index].completed) {
            quests[index].completed = true;
            quests[index].completed_at = new Date().toISOString();
            this.save(DB_KEYS.QUESTS, quests);
            
            // Reward the player
            const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
            const baseGold = quests[index].gold_reward;
            
            // Weapon Bonus Logic
            const bonuses = {
                'common': 1.0,
                'uncommon': 1.1,
                'rare': 1.25,
                'epic': 1.5,
                'legendary': 2.0,
                'mythic': 3.0,
                'divine': 6.0
            };
            const bonus = bonuses[player.equipped_weapon || 'common'] || 1.0;
            const finalGold = Math.round(baseGold * bonus);

            player.xp += quests[index].xp_reward;
            player.gold += finalGold;
            
            // Level up logic
            let leveledUp = false;
            while (player.xp >= player.xp_next) {
                player.level++;
                player.xp -= player.xp_next;
                player.xp_next = Math.round(player.xp_next * 1.5);
                leveledUp = true;
            }
            if (leveledUp && typeof window.playLevelUp === 'function') {
                window.playLevelUp();
            }
            
            this.save(DB_KEYS.PLAYER, player);

            // Auto-unlock any linked reward
            const rewards = this.getRewards();
            const rewardIdx = rewards.findIndex(r => r.quest_id == id);
            if (rewardIdx !== -1) {
                rewards[rewardIdx].unlocked = true;
                this.save(DB_KEYS.REWARDS, rewards);
            }

            this.triggerSync();
            return { 
                status: 'success', 
                player: player, 
                xp_earned: quests[index].xp_reward,
                gold_earned: finalGold,
                bonus_multiplier: bonus
            };
        }
        return { status: 'error', message: 'Quest not found or already completed' };
    },

    // --- REWARD METHODS ---
    getRewards() {
        return this.get(DB_KEYS.REWARDS, []);
    },

    getActiveRewards() {
        return this.getRewards().filter(r => !r.redeemed);
    },

    getRedeemedRewards() {
        return this.getRewards().filter(r => r.redeemed).sort((a, b) => new Date(b.redeemed_at) - new Date(a.redeemed_at));
    },

    addReward(data) {
        const rewards = this.getRewards();
        const cost = Math.max(0, Math.min(5, parseInt(data.cost) || 0));
        const newReward = {
            id: Date.now(),
            quest_id: data.quest_id || null,
            title: data.title,
            cost: cost,
            icon: data.icon || '🎁',
            description: data.description || '',
            unlocked: false,
            redeemed: false,
            redeemed_at: null,
            created_at: new Date().toISOString()
        };
        rewards.push(newReward);
        this.save(DB_KEYS.REWARDS, rewards);
        return { status: 'success', reward: newReward };
    },

    deleteReward(id) {
        let rewards = this.getRewards();
        rewards = rewards.filter(r => r.id != id);
        this.save(DB_KEYS.REWARDS, rewards);
        return { status: 'success' };
    },

    redeemReward(id) {
        const rewards = this.getRewards();
        const index = rewards.findIndex(r => r.id == id);
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);

        if (index !== -1) {
            const reward = rewards[index];
            if (!reward.unlocked) {
                return { status: 'error', message: 'Reward is still locked! Complete the quest first.' };
            }
            if (reward.redeemed) {
                return { status: 'error', message: 'Reward already redeemed!' };
            }
            if (player.gold >= reward.cost) {
                player.gold -= reward.cost;
                reward.redeemed = true;
                reward.redeemed_at = new Date().toISOString();
                
                if (typeof window.playCoin === 'function') window.playCoin();
                this.save(DB_KEYS.REWARDS, rewards);
                this.save(DB_KEYS.PLAYER, player);
                return { status: 'success', gold: player.gold, message: '✓ Reward Redeemed!' };
            } else {
                return { status: 'error', message: 'Not enough gold!' };
            }
        }
        return { status: 'error', message: 'Reward not found' };
    },

    // --- ACHIEVEMENT METHODS ---
    getAchievements(filter = 'all') {
        let achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        if (filter === 'unlocked') return achievements.filter(a => a.unlocked);
        if (filter === 'locked') return achievements.filter(a => !a.unlocked);
        return achievements;
    },

    getAchievementsData(filter = 'all') {
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        const filtered = this.getAchievements(filter);
        
        const rarityCounts = {};
        ['common','uncommon','rare','epic','legendary','mythic'].forEach(r => {
            const tot = achievements.filter(a => a.rarity === r).length;
            const cnt = achievements.filter(a => a.rarity === r && a.unlocked).length;
            rarityCounts[r] = { tot, cnt };
        });

        return {
            status: 'success',
            achievements: filtered,
            total: achievements.length,
            unlocked: achievements.filter(a => a.unlocked).length,
            rarityCounts: rarityCounts
        };
    },

    unlockAchievement(id) {
        const achievements = this.get(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        const index = achievements.findIndex(a => a.id == id);
        if (index !== -1 && !achievements[index].unlocked) {
            achievements[index].unlocked = true;
            achievements[index].unlocked_at = new Date().toISOString();
            this.save(DB_KEYS.ACHIEVEMENTS, achievements);
            return { status: 'success', achievement: achievements[index] };
        }
        return { status: 'error', message: 'Already unlocked or not found' };
    },

    // --- SHOP METHODS ---
    buyItem(itemKey) {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const xpItems = {
            'xp_boost': { cost: 50, xp: 100, name: 'XP Scroll' },
            'xp_mega': { cost: 150, xp: 300, name: 'Mega XP Tome' },
            'xp_legend': { cost: 400, xp: 1000, name: 'Legendary Scroll' }
        };

        const item = xpItems[itemKey];
        if (!item) return { status: 'error', message: 'Item not found' };

        if (player.gold >= item.cost) {
            player.gold -= item.cost;
            player.xp += item.xp;
            
            // Level up check
            let leveledUp = false;
            while (player.xp >= player.xp_next) {
                player.level++;
                player.xp -= player.xp_next;
                player.xp_next = Math.round(player.xp_next * 1.5);
                leveledUp = true;
            }
            if (leveledUp && typeof window.playLevelUp === 'function') {
                window.playLevelUp();
            }
            if (typeof window.playCoin === 'function') window.playCoin();

            this.save(DB_KEYS.PLAYER, player);
            return { status: 'success', message: `✓ Bought ${item.name}!`, gold: player.gold };
        } else {
            return { status: 'error', message: 'Not enough gold!' };
        }
    },

    buyWeapon(rarity) {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        const rarities = {
            'uncommon': { cost: 600, minLevel: 3 },
            'rare': { cost: 1500, minLevel: 5 },
            'epic': { cost: 5000, minLevel: 10 },
            'legendary': { cost: 8000, minLevel: 13 },
            'mythic': { cost: 12000, minLevel: 15 },
            'divine': { cost: 20000, minLevel: 20 }
        };

        const r = rarities[rarity];
        if (!r) return { status: 'error', message: 'Invalid rarity' };

        if (player.level < r.minLevel) {
            return { status: 'error', message: `🛡️ Level Required: ${r.minLevel}!` };
        }

        if (player.gold >= r.cost) {
            player.gold -= r.cost;
            
            // Add to inventory if not already there
            if (!player.weapon_inventory) player.weapon_inventory = ['common'];
            if (!player.weapon_inventory.includes(rarity)) {
                player.weapon_inventory.push(rarity);
            }
            
            // Auto-equip the new better weapon
            player.equipped_weapon = rarity;
            player.weapon_rarity = rarity; // Legacy support
            
            // Flag mythic ownership for class switching
            if (rarity === 'mythic') {
                player.has_mythic_weapon = true;
            }

            if (typeof window.playCoin === 'function') window.playCoin();
            this.save(DB_KEYS.PLAYER, player);
            this.triggerSync();
            return { status: 'success', message: `⚔️ ${rarity.toUpperCase()} Weapon Added to Collection!`, gold: player.gold };
        } else {
            return { status: 'error', message: 'Not enough gold!' };
        }
    },

    equipWeapon(rarity) {
        const player = this.get(DB_KEYS.PLAYER, INITIAL_PLAYER);
        if (player.weapon_inventory && player.weapon_inventory.includes(rarity)) {
            player.equipped_weapon = rarity;
            player.weapon_rarity = rarity; // Legacy support
            this.save(DB_KEYS.PLAYER, player);
            return { status: 'success', message: `⚔️ Equipped ${rarity.toUpperCase()} Weapon!` };
        }
        return { status: 'error', message: 'Weapon not owned!' };
    },

    // --- DATA MANAGEMENT ---
    async forceSync() {
        const userId = localStorage.getItem('ql_user_id');
        if (!userId) return { status: 'error', message: 'Not logged in' };

        try {
            const allData = {
                player: this.get(DB_KEYS.PLAYER),
                quests: this.get(DB_KEYS.QUESTS),
                achievements: this.get(DB_KEYS.ACHIEVEMENTS),
                rewards: this.get(DB_KEYS.REWARDS)
            };
            await cloudSync.uploadData(userId, allData);
            return { status: 'success', message: '✓ Cloud Backup Complete!' };
        } catch (e) {
            return { status: 'error', message: 'Sync failed: ' + e.message };
        }
    },

    async retrieveSync() {
        const userId = localStorage.getItem('ql_user_id');
        if (!userId) return { status: 'error', message: 'Not logged in' };

        try {
            const cloudData = await cloudSync.downloadData(userId);
            if (!cloudData) {
                return { status: 'error', message: 'No cloud data found for this account.' };
            }

            // Restore data to local storage
            if (cloudData.player) this.save(DB_KEYS.PLAYER, cloudData.player);
            if (cloudData.quests) this.save(DB_KEYS.QUESTS, cloudData.quests);
            if (cloudData.achievements) this.save(DB_KEYS.ACHIEVEMENTS, cloudData.achievements);
            if (cloudData.rewards) this.save(DB_KEYS.REWARDS, cloudData.rewards);

            return { status: 'success', message: '✓ Data retrieved from cloud! Reloading...' };
        } catch (e) {
            return { status: 'error', message: 'Retrieve failed: ' + e.message };
        }
    },

    async deleteAccount() {
        try {
            // 1. Delete from Cloud
            const cloudRes = await cloudSync.deleteAccount();
            if (cloudRes.status === 'error') return cloudRes;

            // 2. Clear Local Data
            this.resetProgress();
            localStorage.removeItem('ql_user_id');
            localStorage.removeItem('ql_last_user_id');

            return { status: 'success', message: '💀 Account and all data deleted permanently.' };
        } catch (e) {
            return { status: 'error', message: 'Deletion failed: ' + e.message };
        }
    },

    resetProgress() {
        this.save(DB_KEYS.PLAYER, INITIAL_PLAYER);
        this.save(DB_KEYS.QUESTS, INITIAL_QUESTS);
        this.save(DB_KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
        this.save(DB_KEYS.REWARDS, []);
        return { status: 'success', message: '🗑️ Progress Reset Locally!' };
    }
};

// Auto-init
db.init();

