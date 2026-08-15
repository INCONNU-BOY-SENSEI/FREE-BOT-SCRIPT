const fs = require('fs-extra');
const path = require('path');
const { jidNormalizedUser } = require('baileys');

const DATA_PATH = path.join(__dirname, '..', 'data', 'antilink.json');
const LINK_REGEX = /(https?:\/\/|www\.)[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/[^\s]+|t\.me\/[^\s]+/i;

function loadData() {
    try {
        fs.ensureFileSync(DATA_PATH);
        const raw = fs.readFileSync(DATA_PATH, 'utf8').trim();
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

if (!global.antilinkData) global.antilinkData = loadData();
if (!global.antilinkActiveListeners) global.antilinkActiveListeners = new Map();

function saveData() {
    try {
        fs.ensureFileSync(DATA_PATH);
        fs.writeFileSync(DATA_PATH, JSON.stringify(global.antilinkData, null, 2));
    } catch (e) {
        console.error('Antilink save error:', e.message);
    }
}

function getGroupConfig(groupId) {
    if (!global.antilinkData[groupId]) {
        global.antilinkData[groupId] = { enabled: false, action: 'delete', warns: {} };
    }
    return global.antilinkData[groupId];
}

function initAntilink(socket) {
    try {
        if (!socket || !socket.user || !socket.user.id) return;
        if (socket._antilinkListenerAttached) return; // already attached on THIS socket instance
        socket._antilinkListenerAttached = true;

        const sessionJid = jidNormalizedUser(socket.user.id);
        const socketId = sessionJid.split('@')[0];

        const listener = async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg?.message || msg.key.fromMe) return;

                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || !remoteJid.endsWith('@g.us')) return;

                const groupConf = getGroupConfig(remoteJid);
                if (!groupConf.enabled) return;

                const body =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption ||
                    '';

                if (!body || !LINK_REGEX.test(body)) return;

                const participantJid = msg.key.participant || msg.key.remoteJid;

                let groupMetadata;
                try {
                    groupMetadata = await socket.groupMetadata(remoteJid);
                } catch (e) {
                    return;
                }

                const participants = groupMetadata.participants || [];
                const botJid = jidNormalizedUser(socket.user.id);
                const isBotAdmin = participants.some(p => (p.id === botJid || p.id.split('@')[0] === socketId) && p.admin);
                if (!isBotAdmin) return; // can't moderate without being admin

                const isSenderAdmin = participants.some(p => p.id === participantJid && p.admin);
                if (isSenderAdmin) return; // admins are exempt from antilink

                try {
                    await socket.sendMessage(remoteJid, { delete: msg.key });
                } catch (e) {}

                if (groupConf.action === 'delete') return;

                if (groupConf.action === 'kick') {
                    try {
                        await socket.groupParticipantsUpdate(remoteJid, [participantJid], 'remove');
                        await socket.sendMessage(remoteJid, {
                            text: `🚫 *Antilink:* @${participantJid.split('@')[0]} was removed for sending a link.`,
                            mentions: [participantJid]
                        });
                    } catch (e) {}
                    return;
                }

                if (groupConf.action === 'warn') {
                    groupConf.warns[participantJid] = (groupConf.warns[participantJid] || 0) + 1;
                    const count = groupConf.warns[participantJid];
                    saveData();

                    if (count >= 3) {
                        try {
                            await socket.groupParticipantsUpdate(remoteJid, [participantJid], 'remove');
                            await socket.sendMessage(remoteJid, {
                                text: `🚫 *Antilink:* @${participantJid.split('@')[0]} reached 3/3 warnings and was removed.`,
                                mentions: [participantJid]
                            });
                        } catch (e) {}
                        delete groupConf.warns[participantJid];
                        saveData();
                    } else {
                        await socket.sendMessage(remoteJid, {
                            text: `⚠️ *Antilink Warning ${count}/3*\n@${participantJid.split('@')[0]}, links are not allowed in this group.`,
                            mentions: [participantJid]
                        });
                    }
                }
            } catch (e) {
                console.error('Antilink listener error:', e.message);
            }
        };

        socket.ev.on('messages.upsert', listener);
        global.antilinkActiveListeners.set(socketId, listener);
    } catch (e) {
        console.error('Antilink init error:', e.message);
    }
}

module.exports = {
    name: "antilink",
    category: "group",
    description: "🔗 Delete/warn/kick members who send links in the group",
    commands: ["antilink"],
    init: initAntilink,

    handler: async ({ socket, sender, args, reply, isGroup, isOwner, senderNumber }) => {
        if (!isGroup) return reply('👥 *This command only works in groups.*');

        try {
            const groupMetadata = await socket.groupMetadata(sender);
            const participants = groupMetadata.participants || [];
            const senderJid = senderNumber + '@s.whatsapp.net';
            const isSenderAdmin = participants.some(p => p.id === senderJid && p.admin);

            if (!isOwner && !isSenderAdmin) {
                return reply('❌ *Only group admins or the bot owner can configure antilink.*');
            }

            const option = (args[0] || '').toLowerCase();
            const groupConf = getGroupConfig(sender);

            if (option === 'on') {
                groupConf.enabled = true;
                saveData();
                return reply(`✅ *Antilink enabled* for this group.\n🔸 Current action: *${groupConf.action.toUpperCase()}*`);
            }

            if (option === 'off') {
                groupConf.enabled = false;
                saveData();
                return reply('✅ *Antilink disabled* for this group.');
            }

            if (['warn', 'kick', 'delete'].includes(option)) {
                groupConf.enabled = true;
                groupConf.action = option;
                saveData();
                return reply(`✅ *Antilink enabled* — action set to *${option.toUpperCase()}*.`);
            }

            return reply(
                `🔗 *Antilink Settings*\n\n` +
                `🔸 Status: *${groupConf.enabled ? 'ON' : 'OFF'}*\n` +
                `🔸 Action: *${groupConf.action.toUpperCase()}*\n\n` +
                `*Usage:*\n` +
                `• .antilink on\n` +
                `• .antilink off\n` +
                `• .antilink warn\n` +
                `• .antilink kick\n` +
                `• .antilink delete\n\n` +
                `> *BY INCONNU BOY*`
            );
        } catch (e) {
            return reply(`❌ *Error:* ${e.message}`);
        }
    }
};
