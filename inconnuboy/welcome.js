const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const { jidNormalizedUser } = require('baileys');

const DATA_PATH = path.join(__dirname, '..', 'data', 'welcome.json');
const FALLBACK_IMG = 'https://i.postimg.cc/4xXj3T8R/file-00000000f890820e9ec3d21792b1cc8b.png';

function loadData() {
    try {
        fs.ensureFileSync(DATA_PATH);
        const raw = fs.readFileSync(DATA_PATH, 'utf8').trim();
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

if (!global.welcomeData) global.welcomeData = loadData();
if (!global.welcomeActiveListeners) global.welcomeActiveListeners = new Map();

function saveData() {
    try {
        fs.ensureFileSync(DATA_PATH);
        fs.writeFileSync(DATA_PATH, JSON.stringify(global.welcomeData, null, 2));
    } catch (e) {
        console.error('Welcome save error:', e.message);
    }
}

function isEnabled(groupId) {
    if (!(groupId in global.welcomeData)) return true; // ON by default
    return global.welcomeData[groupId] !== false;
}

async function getProfilePic(socket, jid) {
    try {
        return await socket.profilePictureUrl(jid, 'image');
    } catch (e) {
        return null;
    }
}

function initWelcome(socket) {
    try {
        if (!socket || !socket.user || !socket.user.id) return;
        if (socket._welcomeListenerAttached) return; // already attached on THIS socket instance
        socket._welcomeListenerAttached = true;

        const sessionJid = jidNormalizedUser(socket.user.id);
        const socketId = sessionJid.split('@')[0];

        const listener = async (update) => {
            try {
                const { id: groupId, participants, action } = update || {};
                if (!groupId || !participants?.length) return;
                if (action !== 'add' && action !== 'remove') return;
                if (!isEnabled(groupId)) return;

                let groupMetadata;
                try {
                    groupMetadata = await socket.groupMetadata(groupId);
                } catch (e) {
                    return;
                }

                const memberCount = groupMetadata.participants?.length || 0;
                const groupName = groupMetadata.subject || 'this group';
                const dateStr = moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');

                for (const participantId of participants) {
                    const userTag = `@${participantId.split('@')[0]}`;

                    let pic = await getProfilePic(socket, participantId);
                    if (!pic) pic = await getProfilePic(socket, sessionJid);
                    if (!pic) pic = FALLBACK_IMG;

                    const title = action === 'add' ? '☘️WELCOME ☘️' : '👋GOODBYE 👋';

                    const caption =
                        `*╭┈───〔 ORION MD 〕┈───⊷*\n` +
                        `*├⬗ ${title}*\n` +
                        `*├⬗ USER :* ${userTag}\n` +
                        `*├⬗ GROUP :* ${groupName}\n` +
                        `*├⬗ DATE :* ${dateStr}\n` +
                        `*├⬗ Members :* ${memberCount}\n` +
                        `*╰───────────────────⊷*\n\n` +
                        `> *BY INCONNU BOY*`;

                    try {
                        await socket.sendMessage(groupId, {
                            image: { url: pic },
                            caption,
                            mentions: [participantId]
                        });
                    } catch (e) {
                        console.error('Welcome send error:', e.message);
                    }
                }
            } catch (e) {
                console.error('Welcome listener error:', e.message);
            }
        };

        socket.ev.on('group-participants.update', listener);
        global.welcomeActiveListeners.set(socketId, listener);
    } catch (e) {
        console.error('Welcome init error:', e.message);
    }
}

module.exports = {
    name: "welcome",
    category: "group",
    description: "👋 Toggle welcome & goodbye messages for the group (ON by default)",
    commands: ["welcome"],
    init: initWelcome,

    handler: async ({ socket, sender, args, reply, isGroup, isOwner, senderNumber }) => {
        if (!isGroup) return reply('👥 *This command only works in groups.*');

        try {
            const groupMetadata = await socket.groupMetadata(sender);
            const participants = groupMetadata.participants || [];
            const senderJid = senderNumber + '@s.whatsapp.net';
            const isSenderAdmin = participants.some(p => p.id === senderJid && p.admin);

            if (!isOwner && !isSenderAdmin) {
                return reply('❌ *Only group admins or the bot owner can configure this.*');
            }

            const option = (args[0] || '').toLowerCase();

            if (option === 'on') {
                global.welcomeData[sender] = true;
                saveData();
                return reply('✅ *Welcome & Goodbye messages turned ON* for this group.');
            }

            if (option === 'off') {
                global.welcomeData[sender] = false;
                saveData();
                return reply('✅ *Welcome & Goodbye messages turned OFF* for this group.');
            }

            return reply(
                `👋 *Welcome Settings*\n\n` +
                `🔸 Status: *${isEnabled(sender) ? 'ON' : 'OFF'}*\n\n` +
                `*Usage:*\n• .welcome on\n• .welcome off\n\n` +
                `> *BY INCONNU BOY*`
            );
        } catch (e) {
            return reply(`❌ *Error:* ${e.message}`);
        }
    }
};
