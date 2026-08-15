const fs = require('fs-extra');
const path = require('path');

const SADEW_CATEGORIES = {
    1: {
        emoji: '📥',
        name: 'Download Menu',
        items: [
            { cmd: '.video', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ' },
            { cmd: '.fb', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ' },
            { cmd: '.tt', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ' }
        ]
    },
    2: {
        emoji: '🧠',
        name: 'AI Commands',
        items: [
            { cmd: '.akira', desc: 'ᴀᴋɪʀᴀ ᴀɪ ɢɪʀʟꜰʀɪᴇɴᴅ' },
            { cmd: '.darkai', desc: 'ᴅᴀʀᴋ ᴀɪ (ᴡᴏʀᴍ-ɢᴘᴛ)' }
        ]
    },
    3: {
        emoji: '👥',
        name: 'Group Manage',
        items: [
            { cmd: '.tagall', desc: 'ᴛᴀɢ ᴀʟʟ ᴍᴇᴍʙᴇʀꜱ' },
            { cmd: '.hidetag', desc: 'ᴛᴀɢ ᴀʟʟ ꜱɪʟᴇɴᴛʟʏ' },
            { cmd: '.add', desc: 'ᴀᴅᴅ ᴍᴇᴍʙᴇʀ' },
            { cmd: '.kick', desc: 'ʀᴇᴍᴏᴠᴇ ᴍᴇᴍʙᴇʀ' },
            { cmd: '.promote', desc: 'ᴍᴀᴋᴇ ᴀᴅᴍɪɴ' },
            { cmd: '.demote', desc: 'ʀᴇᴍᴏᴠᴇ ᴀᴅᴍɪɴ' },
            { cmd: '.tagadmin', desc: 'ᴛᴀɢ ᴀʟʟ ᴀᴅᴍɪɴꜱ' },
            { cmd: '.groupinfo', desc: 'ɢʀᴏᴜᴘ ɪɴꜰᴏ' }
        ]
    },
    4: {
        emoji: '⚙️',
        name: 'Admin Menu',
        items: [
            { cmd: '.mode', desc: 'ᴄʜᴀɴɢᴇ ʙᴏᴛ ᴍᴏᴅᴇ' },
            { cmd: '.lockgroup', desc: 'ʟᴏᴄᴋ ɢʀᴏᴜᴘ' },
            { cmd: '.unlockgroup', desc: 'ᴜɴʟᴏᴄᴋ ɢʀᴏᴜᴘ' },
            { cmd: '.mute', desc: 'ᴍᴜᴛᴇ ɢʀᴏᴜᴘ' },
            { cmd: '.unmute', desc: 'ᴜɴᴍᴜᴛᴇ ɢʀᴏᴜᴘ' },
            { cmd: '.setname', desc: 'ꜱᴇᴛ ɢʀᴏᴜᴘ ɴᴀᴍᴇ' },
            { cmd: '.setdesc', desc: 'ꜱᴇᴛ ɢʀᴏᴜᴘ ᴅᴇꜱᴄ' },
            { cmd: '.seticon', desc: 'ꜱᴇᴛ ɢʀᴏᴜᴘ ɪᴄᴏɴ' },
            { cmd: '.linkgroup', desc: 'ɢᴇᴛ ɢʀᴏᴜᴘ ʟɪɴᴋ' },
            { cmd: '.revokelink', desc: 'ʀᴇꜱᴇᴛ ɢʀᴏᴜᴘ ʟɪɴᴋ' },
            { cmd: '.bio', desc: 'ꜱᴇᴛ ʙᴏᴛ ʙɪᴏ' },
            { cmd: '.leave', desc: 'ʟᴇᴀᴠᴇ ɢʀᴏᴜᴘ' }
        ]
    },
    5: {
        emoji: '🔧',
        name: 'Tools & Edits',
        items: [
            { cmd: '.sticker', desc: 'ᴄᴏɴᴠᴇʀᴛ ᴛᴏ ꜱᴛɪᴄᴋᴇʀ' },
            { cmd: '.vv', desc: 'ᴅᴇᴄʀʏᴘᴛ ᴠɪᴇᴡ-ᴏɴᴄᴇ' },
            { cmd: '.fancy', desc: 'ꜰᴀɴᴄʏ ᴛᴇxᴛ ꜱᴛʏʟᴇꜱ' },
            { cmd: '.getdp', desc: 'ɢᴇᴛ ᴡʜᴀᴛꜱᴀᴘᴘ ᴅᴘ' },
            { cmd: '.npm', desc: 'ꜱᴇᴀʀᴄʜ ɴᴘᴍ ᴘᴀᴄᴋᴀɢᴇꜱ' },
            { cmd: '.img', desc: 'ꜱᴇᴀʀᴄʜ ɪᴍᴀɢᴇꜱ' }
        ]
    },
    6: {
        emoji: '👑',
        name: 'Owner Area',
        items: [
            { cmd: '.owner', desc: 'ɢᴇᴛ ᴏᴡɴᴇʀ ɪɴꜰᴏ' },
            { cmd: '.active', desc: 'ʟɪꜱᴛ ᴀᴄᴛɪᴠᴇ ꜱᴇꜱꜱɪᴏɴꜱ' },
            { cmd: '.pair', desc: 'ɢᴇᴛ ᴀ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ ꜰᴏʀ ᴀ ɴᴜᴍʙᴇʀ' }
        ]
    },
    7: {
        emoji: '📁',
        name: 'Other Cmds',
        items: [
            { cmd: '.alive', desc: 'ᴄʜᴇᴄᴋ ʙᴏᴛ ᴀʟɪᴠᴇ' },
            { cmd: '.system', desc: 'ɢᴇᴛ ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏ' },
            { cmd: '.ping', desc: 'ɢᴇᴛ ʙᴏᴛ ꜱᴘᴇᴇᴅ' },
            { cmd: '.lvcal', desc: 'ʟᴏᴠᴇ ᴄᴀʟᴄᴜʟᴀᴛᴏʀ' },
            { cmd: '.hack', desc: 'ꜰᴀᴋᴇ ʜᴀᴄᴋ ᴀɴɪᴍᴀᴛɪᴏɴ' },
            { cmd: '.hentai', desc: 'ʀᴀɴᴅᴏᴍ ʜᴇɴᴛᴀɪ (18+)' }
        ]
    },
    8: {
        emoji: '🎵',
        name: 'Song & Music',
        items: [
            { cmd: '.song', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ꜱᴏɴɢ (ᴍᴘ3)' }
        ]
    },9: {
        emoji: '🖼️',
        name: 'AI Image Menu',
        items: [] // Left empty — auto-filled by the plugin
    }
};

const PLUGINS_PATH = path.join(__dirname, '..', 'inconnuboy');
const loadedPlugins = []; // { name, category, commands: [{cmd, desc}], handler, raw }

const CATEGORY_KEYWORDS = {
    1: ['download', 'dl', 'video', 'fb', 'facebook', 'tiktok', 'tt', 'reel', 'insta', 'instagram', 'movie', 'cinesubz', 'moviebox'],
    2: ['ai', 'gpt', 'chat', 'bot reply', 'orion', 'darkgpt', 'darkai', 'assistant'],
    3: ['group', 'tag', 'admin add', 'kick', 'promote', 'demote', 'member'],
    4: ['mode', 'lock', 'mute', 'setname', 'setdesc', 'seticon', 'link', 'bio', 'leave', 'setting', 'config'],
    5: ['sticker', 'vv', 'view-once', 'fancy', 'text style', 'getdp', 'dp', 'npm', 'img', 'image', 'tool', 'edit'],
    6: ['owner', 'active', 'session', 'dev'],
    7: ['alive', 'system', 'ping', 'lvcal', 'love', 'hack', 'hentai', 'fun', 'game'],
    8: ['song', 'music', 'mp3', 'audio', 'lyrics', 'playlist'],
	9: ['dalle', 'pixabay', 'picsum', 'flickr', 'dog', 'cat', 'bingimg']
};

function autoDetectCategory(plugin) {
    if (plugin.category && SADEW_CATEGORIES[plugin.category]) return plugin.category;

    const haystack = [
        plugin.name || '',
        plugin.description || '',
        ...(plugin.commands || []).map(c => (typeof c === 'string' ? c : c.cmd || ''))
    ].join(' ').toLowerCase();

    for (const [catNum, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(k => haystack.includes(k))) {
            return parseInt(catNum);
        }
    }

    return 7;
}

function loadPlugins() {
    loadedPlugins.length = 0;

    if (!fs.existsSync(PLUGINS_PATH)) {
        fs.ensureDirSync(PLUGINS_PATH);
        console.log('📁 Created empty plugins folder at', PLUGINS_PATH);
        return;
    }

    const files = fs.readdirSync(PLUGINS_PATH).filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            delete require.cache[require.resolve(path.join(PLUGINS_PATH, file))];
            const plugin = require(path.join(PLUGINS_PATH, file));

            if (!plugin || !plugin.commands || !Array.isArray(plugin.commands) || typeof plugin.handler !== 'function') {
                console.warn(`⚠️ Skipped invalid plugin: ${file} (needs { commands: [], handler: fn })`);
                continue;
            }

            const normalizedCommands = plugin.commands.map(c =>
                typeof c === 'string'
                    ? { cmd: c.startsWith('.') ? c : '.' + c, desc: plugin.description || 'ɴᴏ ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ' }
                    : { cmd: c.cmd.startsWith('.') ? c.cmd : '.' + c.cmd, desc: c.desc || plugin.description || 'ɴᴏ ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ' }
            );

            const category = autoDetectCategory({ ...plugin, commands: normalizedCommands });

            loadedPlugins.push({
                file,
                name: plugin.name || file.replace('.js', ''),
                category,
                commands: normalizedCommands,
                handler: plugin.handler
            });

            console.log(`✅ Plugin loaded: ${file} → Category ${category} (${SADEW_CATEGORIES[category].name}) [${normalizedCommands.map(c => c.cmd).join(', ')}]`);
        } catch (e) {
            console.error(`❌ Failed to load plugin ${file}:`, e.message);
        }
    }
}

loadPlugins();
try {
    fs.watch(PLUGINS_PATH, { persistent: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`🔄 Plugin change detected (${filename}), reloading plugins...`);
            setTimeout(loadPlugins, 300); // tiny debounce so the file finishes writing
        }
    });
} catch (e) {
    console.warn('Plugin folder watch not available:', e.message);
}

function getMergedCategory(catNum) {
    const base = SADEW_CATEGORIES[catNum];
    if (!base) return null;
    const pluginItems = loadedPlugins
        .filter(p => p.category === catNum)
        .flatMap(p => p.commands);
    return {
        emoji: base.emoji,
        name: base.name,
        items: [...base.items, ...pluginItems]
    };
}

function getTotalCommandCount() {
    const builtInCount = Object.values(SADEW_CATEGORIES).reduce((sum, cat) => sum + cat.items.length, 0);
    const pluginCount = loadedPlugins.reduce((sum, p) => sum + p.commands.length, 0);
    return builtInCount + pluginCount;
}

function findPluginForCommand(commandNoPrefix) {
    return loadedPlugins.find(p =>
        p.commands.some(c => c.cmd.replace(/^\./, '').toLowerCase() === commandNoPrefix)
    );
}

function buildCategoryBlock(catNum) {
    const cat = getMergedCategory(catNum);
    if (!cat) return null;

    const bodyLines = cat.items.length
        ? cat.items.map(i => `*┋ ▸ ${i.cmd.replace(/^\./, '')}*`).join('\n')
        : `*┋ ▸ ─*`;

    return (
        `\`『 ${cat.emoji} ${cat.name} 』\`\n` +
        `╭───────────────────⊷\n` +
        `${bodyLines}\n` +
        `╰───────────────────⊷`
    );
}

function buildCategoryButtonMessage(catNum) {
    const block = buildCategoryBlock(catNum);
    if (!block) return null;

    return {
        text: `${block}\n\n> *BY INCONNU BOY*`
    };
}


module.exports = {
    SADEW_CATEGORIES,
    CATEGORY_KEYWORDS,
    autoDetectCategory,
    loadPlugins,
    getLoadedPlugins: () => loadedPlugins,
    getMergedCategory,
    getTotalCommandCount,
    findPluginForCommand,
    buildCategoryBlock,
    buildCategoryButtonMessage
};
