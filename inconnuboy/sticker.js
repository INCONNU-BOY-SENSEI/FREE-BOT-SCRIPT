const { downloadContentFromMessage, getContentType } = require("baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

/**
 * ⚡ Media to Sticker Generator (Sadew-Mini System)
 */
module.exports = {
    name: "sticker_maker",
    category: "media",
    description: "Reply to an image or video to convert it into a sticker.",
    commands: ["x", "s", "sticker"], // Command is .x or .s

    handler: async ({ socket, msg, sender, command, args }) => {
        try {
            console.log(`[SADEW-MINI BOT] .${command} command execution started.`);

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            let actualMessage = quotedMsg ? quotedMsg : msg.message;

            const isViewOnce = actualMessage.viewOnceMessage || actualMessage.viewOnceMessageV2 || actualMessage.viewOnceMessageV2Extension;
            if (isViewOnce) {
                actualMessage = actualMessage.viewOnceMessage?.message || actualMessage.viewOnceMessageV2?.message || actualMessage.viewOnceMessageV2Extension?.message;
            }

            const type = getContentType(actualMessage);
            
            if (type !== 'imageMessage' && type !== 'videoMessage') {
                return await socket.sendMessage(sender, { 
                    text: `❌ *Usage:* Please reply to an *Image* or *Video* (under 10s) and type:\n.${command}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                }, { quoted: msg });
            }

            const mediaMessage = actualMessage[type];
            const mediaType = type === 'imageMessage' ? 'image' : 'video';

            await socket.sendMessage(sender, { react: { text: "🔄", key: msg.key } });

            console.log(`[SADEW-MINI BOT] Downloading ${mediaType} from WhatsApp...`);
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) {
                throw new Error("Downloaded buffer is empty.");
            }

            console.log("[SADEW-MINI BOT] Converting to sticker...");
            const sticker = new Sticker(buffer, {
                pack: 'ORION MD', // Your sticker pack name
                author: 'INCONNU BOY', // Your name
                type: StickerTypes.FULL, // FULL or CROPPED
                categories: ['🤩', '🎉'], 
                quality: 50, // Best quality suited for videos
                background: 'transparent'
            });

            const stickerBuffer = await sticker.toBuffer();

            console.log("[SADEW-MINI BOT] Sending sticker to user...");
            await socket.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error("[SADEW-MINI BOT] STICKER ERROR OCCURRED:", error);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            
            const errMsg = error.message.includes("video") || error.message.includes("duration")
                ? "❌ *Error:* The video may be longer than 10 seconds."
                : `❌ *Error:* Could not create the sticker.`;
                
            await socket.sendMessage(sender, { text: errMsg }, { quoted: msg });
        }
    }
};
