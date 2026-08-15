const { downloadContentFromMessage } = require("baileys");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: "video-to-mp3",
    category: 8,
    description: "Convert video to MP3 audio by replying .mp3",
    commands: ["mp3", "toaudio"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        try {
            let videoMessage = null;

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg?.videoMessage) {
                videoMessage = quotedMsg.videoMessage;
            }
            else if (msg.message?.videoMessage) {
                videoMessage = msg.message.videoMessage;
            }
            else if (quotedMsg?.viewOnceMessage?.message?.videoMessage) {
                videoMessage = quotedMsg.viewOnceMessage.message.videoMessage;
            }
            else if (quotedMsg?.viewOnceMessageV2?.message?.videoMessage) {
                videoMessage = quotedMsg.viewOnceMessageV2.message.videoMessage;
            }

            if (!videoMessage) {
                return await socket.sendMessage(sender, {
                    text: `*↳ ❝ [🎵 𝗩𝗶𝗱𝗲𝗼 𝘁𝗼 𝗠𝗣𝟯 🎵] ¡! ❞*\n\n` +
                          `❌ *No video found!*\n\n` +
                          `📌 *Usage:*\n` +
                          `┊ Reply to a video with *.mp3*\n\n` +
                          `> *BY INCONNU BOY*`
                }, { quoted: msg });
            }

            const fileSize = videoMessage.fileLength || 0;
            if (fileSize > 50 * 1024 * 1024) {
                return await socket.sendMessage(sender, {
                    text: `❌ *Video is larger than 50MB! Please send a smaller video.*`
                }, { quoted: msg });
            }

            await socket.sendMessage(sender, { react: { text: "🎵", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `🎵 *Extracting audio...*\n_MP3 will be ready shortly..._`
            }, { quoted: msg });

            const stream = await downloadContentFromMessage(videoMessage, 'video');
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const videoBuffer = Buffer.concat(chunks);

            const tmpId = crypto.randomBytes(8).toString('hex');
            const tmpDir = os.tmpdir();
            const inputPath = path.join(tmpDir, `orion_v2a_${tmpId}.mp4`);
            const outputPath = path.join(tmpDir, `orion_v2a_${tmpId}.mp3`);

            fs.writeFileSync(inputPath, videoBuffer);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .audioBitrate(128)
                    .audioFrequency(44100)
                    .format('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputPath);
            });

            if (!fs.existsSync(outputPath)) {
                throw new Error("MP3 file creation failed");
            }

            const audioBuffer = fs.readFileSync(outputPath);

            await socket.sendMessage(sender, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            try { fs.unlinkSync(inputPath); } catch (_) {}
            try { fs.unlinkSync(outputPath); } catch (_) {}

        } catch (e) {
            console.error("MP3 Convert Error:", e.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `❌ *Audio Extraction Error!*\n_${e.message}_`
            }, { quoted: msg });
        }
    }
};
