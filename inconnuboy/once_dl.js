const { downloadContentFromMessage, getContentType, jidNormalizedUser } = require('baileys');

if (!global.onceDlListeners) global.onceDlListeners = new Map();

function initOnceDL(socket) {
    if (!socket || !socket.user) return;
    const sessionJid = jidNormalizedUser(socket.user.id);
    const socketId = sessionJid.split('@')[0];

    const active = global.onceDlListeners.get(socketId);
    if (active && active.socket === socket) return; 

    const onceListener = async (chatUpdate) => {
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

            const isViewOnce = quotedMsg.viewOnceMessage || 
                               quotedMsg.viewOnceMessageV2 || 
                               quotedMsg.viewOnceMessageV2Extension || 
                               quotedMsg.imageMessage?.viewOnce || 
                               quotedMsg.videoMessage?.viewOnce || 
                               quotedMsg.audioMessage?.viewOnce;

            if (!isViewOnce) return;

            let actualMessage = quotedMsg;
            if (quotedMsg.viewOnceMessage?.message) actualMessage = quotedMsg.viewOnceMessage.message;
            else if (quotedMsg.viewOnceMessageV2?.message) actualMessage = quotedMsg.viewOnceMessageV2.message;
            else if (quotedMsg.viewOnceMessageV2Extension?.message) actualMessage = quotedMsg.viewOnceMessageV2Extension.message;

            const type = getContentType(actualMessage);
            if (!type || (type !== 'imageMessage' && type !== 'videoMessage' && type !== 'audioMessage')) return;

            const mediaMsg = actualMessage[type];
            const myInbox = sessionJid; 
            const msgType = type === 'imageMessage' ? 'image' : (type === 'videoMessage' ? 'video' : 'audio');

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

            let buffer = Buffer.from([]);
            let downloadSuccess = false;
            
            for (let i = 0; i < 3; i++) { 
                try {
                    const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
                    buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    downloadSuccess = true;
                    break; 
                } catch (e) {
                    await new Promise(r => setTimeout(r, 1500)); 
                }
            }

            if (!downloadSuccess) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return; 
            }

            let originalCaption = mediaMsg.caption || "";
            let finalCaption = `👁️ *ViewOnce Downloaded*\n\n`;
            if (originalCaption) finalCaption += `📝 *Caption:* ${originalCaption}\n\n`;
            finalCaption += `> BY INCONNU BOY`;

            await socket.sendMessage(myInbox, {
                [msgType]: buffer,
                caption: finalCaption
            });

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Once DL Error:", err.message);
            try {
                await socket.sendMessage(chatUpdate.messages[0].key.remoteJid, { react: { text: '❌', key: chatUpdate.messages[0].key } });
            } catch(e) {}
        }
    };

    socket.ev.on("messages.upsert", onceListener);
    global.onceDlListeners.set(socketId, { socket, listener: onceListener });
    console.log(`👁️ ViewOnce Downloader AUTO-ACTIVATED for ${socketId}`);
}

module.exports = {
    name: "once_downloader",
    category: "utility",
    description: "Download ViewOnce using emojis",
    commands: ["oncedl"],
    init: initOnceDL,
    handler: async ({ socket, reply }) => {
        await reply("✅ *ViewOnce Downloader is Active!*");
    }
};
