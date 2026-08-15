const axios = require('axios');

module.exports = {
    name: "instagram-downloader",
    category: 1,
    description: "Download Instagram Reels, Posts & Carousels (Dual API)",
    commands: ["ig", "insta", "instagram"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "ORION-MD";

        const API_1 = {
            name: "WhiteShadow",
            url: "https://whiteshadow-x-api.onrender.com/api/download/ig",
            token: "VK4fry",
            buildUrl: (igUrl) => `https://whiteshadow-x-api.onrender.com/api/download/ig?url=${encodeURIComponent(igUrl)}&apitoken=VK4fry`
        };
        const API_2 = {
            name: "Zanta",
            url: "https://api.zanta-mini.store/api/insta",
            key: "zan_FIAO7Ayh_eo1vllkep6",
            buildUrl: (igUrl) => `https://api.zanta-mini.store/api/insta?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(igUrl)}`
        };

        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_IG" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Orion Instagram\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        const url = args.join(" ").trim();

        if (!url || !url.includes("instagram.com")) {
            return await socket.sendMessage(sender, {
                text: `*↳ ❝ [📸 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿 📸] ¡! ❞*\n\n` +
                      `❌ *Please provide an Instagram link!*\n\n` +
                      `📌 *Usage:*\n` +
                      `┊ .ig https://www.instagram.com/reel/xxx\n` +
                      `┊ .ig https://www.instagram.com/p/xxx\n\n` +
                      `> *BY INCONNU BOY*`
            }, { quoted: metaQuote });
        }

        try {
            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `📥 *Downloading Instagram Media...*\n_HD Quality | Please wait..._`
            }, { quoted: msg });

            let mediaItems = []; // { type, url, thumbnail }
            let usedApi = "";

            try {
                console.log("IG: Trying WhiteShadow API...");
                const res1 = await axios.get(API_1.buildUrl(url), { timeout: 25000 });
                const data1 = res1.data;

                if (data1.success && data1.result && data1.result.length > 0) {
                    mediaItems = data1.result.map(item => ({
                        type: item.type || 'video',
                        url: item.url
                    }));
                    usedApi = API_1.name;
                    console.log(`IG: WhiteShadow success — ${mediaItems.length} media found`);
                }
            } catch (err1) {
                console.log("IG: WhiteShadow API failed:", err1.message);
            }

            if (mediaItems.length === 0) {
                try {
                    console.log("IG: Falling back to Zanta API...");
                    const res2 = await axios.get(API_2.buildUrl(url), { timeout: 25000 });
                    const data2 = res2.data;

                    if (data2.success && data2.downloadUrl) {
                        mediaItems = [{
                            type: 'video',
                            url: data2.downloadUrl,
                            thumbnail: data2.thumbnail || null
                        }];
                        usedApi = API_2.name;
                        console.log("IG: Zanta API success — downloadUrl found");
                    }
                } catch (err2) {
                    console.log("IG: Zanta API failed:", err2.message);
                }
            }

            if (mediaItems.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, {
                    text: `❌ *Instagram Download Failed!*\n\n_Check if the link is private or expired._\n\n> *BY INCONNU BOY*`
                }, { quoted: msg });
            }

            const totalMedia = mediaItems.length;

            for (let i = 0; i < totalMedia; i++) {
                const item = mediaItems[i];
                const countLabel = totalMedia > 1 ? ` (${i + 1}/${totalMedia})` : '';
                const typeEmoji = item.type === 'video' ? '🎥' : '🖼️';
                const typeLabel = item.type === 'video' ? 'Video' : 'Image';

                const caption = `*↳ ❝ [📸 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗗𝗟 📸] ¡! ❞*\n\n` +
                                `${typeEmoji} *Type:* ${typeLabel}${countLabel}\n` +
                                `📡 *API:* ${usedApi}\n` +
                                `🔗 *Quality:* HD\n\n` +
                                `> *BY INCONNU BOY*`;

                try {
                    if (item.type === 'video') {
                        await socket.sendMessage(sender, {
                            video: { url: item.url },
                            mimetype: 'video/mp4',
                            caption: caption
                        }, { quoted: metaQuote });
                    } else {
                        await socket.sendMessage(sender, {
                            image: { url: item.url },
                            caption: caption
                        }, { quoted: metaQuote });
                    }
                } catch (sendErr) {
                    console.log(`IG: Media ${i + 1} direct send failed, trying document...`);
                    try {
                        const ext = item.type === 'video' ? 'mp4' : 'jpg';
                        await socket.sendMessage(sender, {
                            document: { url: item.url },
                            mimetype: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
                            fileName: `instagram_hd_${Date.now()}_${i + 1}.${ext}`,
                            caption: caption
                        }, { quoted: metaQuote });
                    } catch (docErr) {
                        console.log(`IG: Document fallback ${i + 1} also failed:`, docErr.message);
                        await socket.sendMessage(sender, {
                            text: `❌ *Media ${i + 1} Download Failed!*`
                        }, { quoted: msg });
                    }
                }

                if (i < totalMedia - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("IG Error:", e.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `❌ *Instagram Download Error!*\n_${e.message}_\n\n> *Orion-MD By Sadew Rashmika 𝜗𝜚⋆*`
            }, { quoted: msg });
        }
    }
};
