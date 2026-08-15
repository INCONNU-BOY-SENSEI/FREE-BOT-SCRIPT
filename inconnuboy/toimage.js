/**
 * .toimage — Reply to a sticker to convert it into an image
 */

const { downloadContentFromMessage } = require("baileys");
const Jimp = require("jimp");

module.exports = {
    name: "toimage",
    category: "media",
    description: "Reply to a sticker with .toimage to convert it into an image.",
    commands: ["toimage", "toimg"],

    handler: async ({ socket, msg, sender, reply }) => {
        try {
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            const stickerMessage = quotedMsg?.stickerMessage;

            if (!stickerMessage) {
                return reply('❌ *Usage:* Reply to a sticker with:\n.toimage');
            }

            await socket.sendMessage(sender, { react: { text: "🔄", key: msg.key } });

            const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) {
                throw new Error("Downloaded buffer is empty.");
            }

            if (stickerMessage.isAnimated) {
                await socket.sendMessage(sender, {
                    video: buffer,
                    gifPlayback: true,
                    caption: '🖼️ *Converted from animated sticker*'
                }, { quoted: msg });
            } else {
                const image = await Jimp.read(buffer);
                const imgBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
                await socket.sendMessage(sender, {
                    image: imgBuffer,
                    caption: '🖼️ *Converted to image*'
                }, { quoted: msg });
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
        } catch (error) {
            console.error("[TOIMAGE] error:", error);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return reply(`❌ *Error:* Could not convert the sticker. ${error.message}`);
        }
    }
};
