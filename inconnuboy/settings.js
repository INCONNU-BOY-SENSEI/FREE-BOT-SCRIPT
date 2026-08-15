const mongoose = require('mongoose');
const { downloadContentFromMessage } = require('baileys');
const axios = require('axios');

module.exports = {
    name: "settings",
    category: 4, 
    description: "Bot Main Settings & Customization",
    commands: ["settings", "panel", "mode", "addpp", "delpp", "btnmode"],

    handler: async ({ socket, msg, sender, command, args, reply, botNumber, sessionConfig, activeSockets, isOwner }) => {
        
        if (!isOwner) {
            return reply('❌ *This command can only be used by the Bot Owner!*');
        }

        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const Session = mongoose.models.SessionNew;

        const saveConfig = async () => {
            const currentData = activeSockets.get(sanitizedNumber);
            if (currentData) {
                currentData.config = sessionConfig;
                activeSockets.set(sanitizedNumber, currentData);
            }
            await Session.findOneAndUpdate(
                { number: sanitizedNumber },
                { config: sessionConfig, updatedAt: new Date() },
                { upsert: true }
            );
        };

        const cmd = command.replace(/^\./, '').toLowerCase();

        if (cmd === 'btnmode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            
            if (option === 'on') {
                sessionConfig.BUTTON_MODE = 'true';
                await saveConfig();
                return reply(`✅ *Global Button Mode ON!*\nAll bot users will now see buttons.`);
            } else if (option === 'off') {
                sessionConfig.BUTTON_MODE = 'false';
                await saveConfig();
                return reply(`✅ *Global Button Mode OFF!*\nAll bot users will now see number replies instead of buttons.`);
            } else {
                return reply(`❌ *Please provide a valid option!*\nExample: .btnmode on (or) .btnmode off`);
            }
        }

        if (cmd === 'settings' || cmd === 'panel') {
            const currentMode = sessionConfig?.MODE || 'public';
            const customLogos = sessionConfig?.CUSTOM_LOGOS || [];
            
            const btnStatus = (sessionConfig?.BUTTON_MODE === 'false') ? "🔴 OFF (Number Reply)" : "🟢 ON (Buttons)";
            
            const panelText = `*𝗢𝗿𝗶𝗼𝗻-𝗠𝗗 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀*\n\n` +
                              `*1️⃣ 𝗪𝗼𝗿𝗸 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔸 Current Mode: *${currentMode.toUpperCase()}*\n` +
                              `  [1] Public | [2] Private | [3] Inbox\n` +
                              `_(To change, use .mode 1, 2 or 3)_\n\n` +
                              `*2️⃣ 𝗠𝗲𝗻𝘂 𝗟𝗼𝗴𝗼 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🖼️ Custom Logos: *${customLogos.length}*\n` +
                              `  • .addpp / .delpp\n\n` +
                              `*3️⃣ 𝗕𝘂𝘁𝘁𝗼𝗻 𝗠𝗼𝗱𝗲 (Global):*\n` +
                              `🔘 Current Status: *${btnStatus}*\n` +
                              `  • To change send *.btnmode on* or *.btnmode off*.\n\n` +
                              `> *BY INCONNU BOY*`;

            let displayLogo = 'https://i.postimg.cc/4xXj3T8R/file-00000000f890820e9ec3d21792b1cc8b.png';
            if (customLogos.length > 0) {
                displayLogo = customLogos[Math.floor(Math.random() * customLogos.length)];
            }

            const sentMsg = await socket.sendMessage(sender, {
                image: { url: displayLogo }, 
                caption: panelText
            }, { quoted: msg });

            global.sadewSettingsTracker = global.sadewSettingsTracker || {};
            global.sadewSettingsTracker[sender] = sentMsg.key.id;
            return;
        }

        if (cmd === 'mode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            let newMode = '';
            if (option === '1' || option === 'public') newMode = 'public';
            else if (option === '2' || option === 'private') newMode = 'private';
            else if (option === '3' || option === 'inbox') newMode = 'inbox';
            
            if (newMode) {
                sessionConfig.MODE = newMode;
                await saveConfig();
                return reply(`✅ *Bot mode successfully changed to ${newMode.toUpperCase()} mode.*`);
            } else {
                return reply(`❌ *Please provide a valid mode!*\nExample: .mode 1`);
            }
        }

        if (cmd === 'addpp') {
            const qMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!qMsg || !qMsg.imageMessage) return reply("🖼️ *Please reply to an image with .addpp!*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                
                const stream = await downloadContentFromMessage(qMsg.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await(const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const base64Image = buffer.toString('base64');
                const apiUrl = 'https://apis.xwolf.space/api/url/imgbb?key=wxa_f_4e840b5e42';
                const response = await axios.post(apiUrl, { image: base64Image });
                const imgUrl = response.data?.url || response.data?.data?.url || response.data?.result?.url;

                if (!imgUrl || !imgUrl.startsWith('http')) {
                    throw new Error("Wolf API Upload Failed");
                }

                if (!sessionConfig.CUSTOM_LOGOS) sessionConfig.CUSTOM_LOGOS = [];
                sessionConfig.CUSTOM_LOGOS.push(imgUrl);
                
                await saveConfig();
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                return reply(`✅ *Image successfully added!*`);
            } catch (e) {
                return reply(`❌ *Error:* ${e.message}`);
            }
        }

        if (cmd === 'delpp') {
            sessionConfig.CUSTOM_LOGOS = [];
            await saveConfig();
            return reply(`✅ *Custom Logo list cleared!*`);
        }
    }
};
