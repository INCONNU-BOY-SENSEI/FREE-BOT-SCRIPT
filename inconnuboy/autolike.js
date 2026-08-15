/**
 * .autolike / .autoview / .likeemoji — Toggle status auto-view & auto-like
 */

const mongoose = require('mongoose');

module.exports = {
    name: "autolike",
    category: "owner",
    description: "Toggle auto-view and auto-like of statuses, and set the like emoji(s).",
    commands: ["autolike", "autoview", "likeemoji"],

    handler: async ({ msg, command, args, reply, botNumber, sessionConfig, activeSockets, isOwner }) => {
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
        const option = args[0] ? args[0].toLowerCase() : '';

        if (cmd === 'autolike') {
            if (option === 'on') {
                sessionConfig.AUTO_LIKE_STATUS = 'true';
                await saveConfig();
                return reply('✅ *Auto-Like Status ON!*\nThe bot will now react to statuses automatically.');
            } else if (option === 'off') {
                sessionConfig.AUTO_LIKE_STATUS = 'false';
                await saveConfig();
                return reply('✅ *Auto-Like Status OFF!*\nThe bot will no longer react to statuses.');
            }
            const state = sessionConfig.AUTO_LIKE_STATUS === 'true' ? 'ON 🟢' : 'OFF 🔴';
            return reply(`ℹ️ *Auto-Like Status is currently:* ${state}\n\nUse *.autolike on* or *.autolike off* to change it.`);
        }

        if (cmd === 'autoview') {
            if (option === 'on') {
                sessionConfig.AUTO_VIEW_STATUS = 'true';
                await saveConfig();
                return reply('✅ *Auto-View Status ON!*\nThe bot will now view statuses automatically.');
            } else if (option === 'off') {
                sessionConfig.AUTO_VIEW_STATUS = 'false';
                await saveConfig();
                return reply('✅ *Auto-View Status OFF!*\nThe bot will no longer view statuses.');
            }
            const state = sessionConfig.AUTO_VIEW_STATUS === 'true' ? 'ON 🟢' : 'OFF 🔴';
            return reply(`ℹ️ *Auto-View Status is currently:* ${state}\n\nUse *.autoview on* or *.autoview off* to change it.`);
        }

        if (cmd === 'likeemoji') {
            if (!args.length) {
                const current = (sessionConfig.AUTO_LIKE_EMOJI || ['🩸']).join(' ');
                return reply(`ℹ️ *Current like emoji(s):* ${current}\n\nExample to change: *.likeemoji ❤️ 🔥 😍*`);
            }
            sessionConfig.AUTO_LIKE_EMOJI = args;
            await saveConfig();
            return reply(`✅ *Like emoji(s) updated to:* ${args.join(' ')}`);
        }
    }
};
