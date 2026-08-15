const { downloadContentFromMessage, getContentType, jidNormalizedUser } = require('baileys');

if (!global.undiciCrashFixed) {
    process.on('uncaughtException', (err) => {
        if (err.message === 'terminated' || err?.code === 'UND_ERR_SOCKET' || err?.message?.includes('other side closed')) {
            console.log('⚠️ Ignored Baileys Download Socket Error (Bot Protected)');
            return;
        }
        console.error('Uncaught Exception:', err);
    });
    global.undiciCrashFixed = true;
}

if (!global.emojiDlListeners) global.emojiDlListeners = new Map();

function initEmojiDL(socket) {
    if (!socket || !socket.user) return;
    const sessionJid = jidNormalizedUser(socket.user.id);
    const socketId = sessionJid.split('@')[0];

    const active = global.emojiDlListeners.get(socketId);
    if (active && active.socket === socket) return; 

    const emojiListener = async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg || !msg.message) return;

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            if (!text) return;

            const trimmed = text.trim();
            const chars = Array.from(trimmed);
            
            if (chars.length < 3) return;
            
            const firstChar = chars[0];
            if (!chars.every(c => c === firstChar)) return;
            if (/[a-zA-Z0-9\s]/.test(firstChar)) return;

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            if (!contextInfo) return;

            const quotedMsg = contextInfo.quotedMessage;
            if (!quotedMsg) return;

            const isStatus = contextInfo.remoteJid === 'status@broadcast';
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;

            if (!isStatus && !isViewOnce) return;

            let actualMessage = quotedMsg;
            if (quotedMsg.viewOnceMessage) actualMessage = quotedMsg.viewOnceMessage.message;
            if (quotedMsg.viewOnceMessageV2) actualMessage = quotedMsg.viewOnceMessageV2.message;
            if (quotedMsg.viewOnceMessageV2Extension) actualMessage = quotedMsg.viewOnceMessageV2Extension.message;

            const type = getContentType(actualMessage);
            if (!type || (type !== 'imageMessage' && type !== 'videoMessage' && type !== 'audioMessage')) return;

            const mediaMsg = actualMessage[type];
            const myInbox = sessionJid; 
            const msgType = type === 'imageMessage' ? 'image' : (type === 'videoMessage' ? 'video' : 'audio');

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

            let buffer = Buffer.from([]);
            let downloadSuccess = false;
            
            for (let i = 0; i < 3; i++) { // Retries up to 3 times
                try {
                    const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
                    buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    downloadSuccess = true;
                    break; // If successful, break out of the loop
                } catch (e) {
                    console.log(`⚠️ Download attempt ${i + 1} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1500)); // Wait 1.5 seconds then retry
                }
            }

            if (!downloadSuccess) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return; 
            }

            let originalCaption = mediaMsg.caption || "";
            const tag = isStatus ? '📱 *Status Downloaded*' : '👁️ *ViewOnce Downloaded*';
            let finalCaption = `${tag}\n\n`;
            if (originalCaption) finalCaption += `📝 *Caption:* ${originalCaption}\n\n`;
            finalCaption += `> BY INCONNU BOY`;

            await socket.sendMessage(myInbox, {
                [msgType]: buffer,
                caption: finalCaption
            });

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Emoji DL Error:", err.message);
            try {
                await socket.sendMessage(chatUpdate.messages[0].key.remoteJid, { react: { text: '❌', key: chatUpdate.messages[0].key } });
            } catch(e) {}
        }
    };

    socket.ev.on("messages.upsert", emojiListener);
    global.emojiDlListeners.set(socketId, { socket, listener: emojiListener });
    console.log(`📥 Emoji Downloader AUTO-ACTIVATED for ${socketId}`);
}

module.exports = {
    name: "emoji_downloader",
    category: "utility",
    description: "Download Status and ViewOnce using emojis",
    commands: ["emojidl"],
    init: initEmojiDL,
    handler: async ({ socket, reply }) => {
        await reply("✅ *Emoji Downloader is Active!*");
    }
};
