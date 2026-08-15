const { jidNormalizedUser } = require("baileys");

if (!global.adCache) global.adCache = [];
if (!global.adActiveListeners) global.adActiveListeners = new Map();

const isBotId = (id) => {
    if (!id) return false;
    return id.startsWith("BAE5") || id.startsWith("3EB0") || id.length === 16;
};

function initAntiDelete(socket) {
    try {
        if (!socket || !socket.user || !socket.user.id) return;

        const sessionJid = jidNormalizedUser(socket.user.id);
        const socketId = sessionJid.split('@')[0];

        if (global.adActiveListeners.has(socketId)) {
            console.log(`🛡️ Anti-Delete already active for ${socketId}`);
            return;
        }

        const adListener = async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                let actualMessage = m.message?.ephemeralMessage?.message ||
                                    m.message?.viewOnceMessage?.message ||
                                    m.message?.viewOnceMessageV2?.message ||
                                    m.message;

                const messageId = m.key.id || "";
                const remoteJid = m.key.remoteJid;
                const isMe = m.key.fromMe;

                if (remoteJid === 'status@broadcast') return;

                const needsFix = !isMe && actualMessage;

                if (needsFix && isBotId(messageId)) {
                    await new Promise(resolve => setTimeout(resolve, 2200));
                }

                const protoMsg = actualMessage?.protocolMessage;
                const isRevoke = protoMsg && (
                    protoMsg.type === 0 ||
                    protoMsg.type === "REVOKE"
                );

                if (isRevoke && protoMsg.key && protoMsg.key.id) {
                    const deletedId = protoMsg.key.id;
                    const foundMsg = global.adCache.find(c => c.id === deletedId);

                    if (foundMsg) {
                        const deletedBy = foundMsg.sender.split("@")[0];
                        const isGroup = foundMsg.chat.endsWith("@g.us");
                        const chatLabel = isGroup ? "Group" : "Private Inbox";

                        let textMsg = `╔═══════════════════════════════════════╗\n`;
                        textMsg += `║     🚫 DELETED MESSAGE DETECTED 🚫      ║\n`;
                        textMsg += `╠═══════════════════════════════════════╣\n`;
                        textMsg += `║                                       ║\n`;
                        textMsg += `║  👤 Deleted By: @${deletedBy}         ║\n`;
                        textMsg += `║  📌 Chat Type: ${chatLabel.padEnd(17)}║\n`;
                        if (isGroup) textMsg += `║  👥 Group: ${foundMsg.chat.split('@')[0].padEnd(19)}║\n`;
                        textMsg += `║  ⏳ Time: ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" }).padEnd(22)}║\n`;
                        textMsg += `║                                       ║\n`;
                        textMsg += `╠═══════════════════════════════════════╣\n`;
                        textMsg += `║  📩 DELETED MESSAGE CONTENT           ║\n`;
                        textMsg += `╚═══════════════════════════════════════╝`;

                        await socket.sendMessage(sessionJid, {
                            text: textMsg,
                            mentions: [foundMsg.sender]
                        });

                        try {
                            await socket.relayMessage(sessionJid, foundMsg.message, {});
                        } catch (relayErr) {
                            try {
                                const cached = foundMsg.message?.ephemeralMessage?.message ||
                                               foundMsg.message?.viewOnceMessage?.message ||
                                               foundMsg.message?.viewOnceMessageV2?.message ||
                                               foundMsg.message;

                                if (cached?.conversation) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     💬 DELETED TEXT MESSAGE          ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  ${cached.conversation.padEnd(39)}║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.extendedTextMessage?.text) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     💬 DELETED TEXT MESSAGE          ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  ${cached.extendedTextMessage.text.padEnd(39)}║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.imageMessage) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     🖼️ DELETED IMAGE MESSAGE         ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  📝 Caption: ${(cached.imageMessage.caption || 'N/A').padEnd(29)}║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.videoMessage) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     🎥 DELETED VIDEO MESSAGE         ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  📝 Caption: ${(cached.videoMessage.caption || 'N/A').padEnd(29)}║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.stickerMessage) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     🎨 DELETED STICKER MESSAGE       ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  🏷️ Sticker was deleted by user      ║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.audioMessage) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     🎵 DELETED AUDIO/VOICE MESSAGE   ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  🎙️ Voice/Audio message was deleted  ║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                } else if (cached?.documentMessage) {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔══════════════════════════════════════╗\n` +
                                              `║  📄 DELETED DOCUMENT MESSAGE      ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                           ║\n` +
                                              `║  📁 File: ${(cached.documentMessage.fileName || 'N/A').padEnd(30)}║\n` +
                                              `║                                       ║\n` +
                                              `╚════════════════════════════════╝`
                                    });
                                } else {
                                    await socket.sendMessage(sessionJid, { 
                                        text: `╔═══════════════════════════════════════╗\n` +
                                              `║     ⚠️ UNSUPPORTED MESSAGE TYPE      ║\n` +
                                              `╠═══════════════════════════════════════╣\n` +
                                              `║                                       ║\n` +
                                              `║  ❌ Cannot forward this message type ║\n` +
                                              `║                                       ║\n` +
                                              `╚═══════════════════════════════════════╝`
                                    });
                                }
                            } catch (fbErr) {
                                console.log("AD fallback error:", fbErr.message);
                            }
                        }
                    }
                }
                else if (actualMessage && !isMe && !protoMsg) {
                    const exists = global.adCache.find(c => c.id === messageId);
                    if (!exists) {
                        global.adCache.push({
                            id: messageId,
                            message: m.message,
                            sender: m.key.participant || remoteJid,
                            chat: remoteJid
                        });

                        if (global.adCache.length > 500) {
                            global.adCache.shift();
                        }
                    }
                }
            } catch (err) {
            }
        };

        socket.ev.on("messages.upsert", adListener);
        global.adActiveListeners.set(socketId, adListener);
        console.log(`🛡️ Anti-Delete AUTO-ACTIVATED for ${socketId}`);

    } catch (e) {
        console.log("AD init error:", e.message);
    }
}

module.exports = {
    name: "antidelete",
    category: 7,
    description: "Anti-Delete System (Auto-On)",
    commands: ["ad", "antidelete"],

    init: initAntiDelete,

    handler: async ({ socket, msg, sender }) => {
        try {
            const sessionJid = jidNormalizedUser(socket.user.id);
            const socketId = sessionJid.split('@')[0];

            if (!global.adActiveListeners.has(socketId)) {
                initAntiDelete(socket);
            }

            const cacheCount = global.adCache.length;

            await socket.sendMessage(sender, {
                text: `*↳ ❝ [🛡️ 𝗔𝗻𝘁𝗶-𝗗𝗲𝗹𝗲𝘁𝗲 𝗦𝘁𝗮𝘁𝘂𝘀 🛡️] ¡! ❞*\n\n` +
                      `✅ *System:* Active (Auto-On)\n` +
                      `📦 *Cached Messages:* ${cacheCount}/500\n` +
                      `👥 *Group Detection:* ✅ Active\n` +
                      `📩 *Inbox Detection:* ✅ Active\n` +
                      `🔄 *Collision Fix:* ✅ Active\n\n` +
                      `> *BY INCONNU BOY*`
            }, { quoted: msg });

        } catch (e) {
            console.log("AD status error:", e.message);
        }
    }
};
