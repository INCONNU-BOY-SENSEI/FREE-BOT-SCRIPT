const mongoose = require('mongoose');

module.exports = {
    name: "setprefix",
    category: "settings",
    description: "⚙️ Change the bot's command prefix",
    commands: ["setprefix"],

    handler: async ({ args, reply, isOwner, botNumber, sessionConfig, activeSockets }) => {
        if (!isOwner) {
            return reply('❌ *This command can only be used by the Bot Owner!*');
        }

        const newPrefix = args[0];

        if (!newPrefix || /\s/.test(newPrefix) || newPrefix.length > 5) {
            return reply(
                `❌ *Please provide a valid prefix (1-5 characters, no spaces).*\n\n` +
                `*Example:* ${sessionConfig.PREFIX || '.'}setprefix !`
            );
        }

        try {
            const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
            const oldPrefix = sessionConfig.PREFIX || '.';

            sessionConfig.PREFIX = newPrefix;

            const currentData = activeSockets.get(sanitizedNumber);
            if (currentData) {
                currentData.config = sessionConfig;
                activeSockets.set(sanitizedNumber, currentData);
            }

            const Session = mongoose.models.SessionNew;
            if (Session) {
                await Session.findOneAndUpdate(
                    { number: sanitizedNumber },
                    { config: sessionConfig, updatedAt: new Date() },
                    { upsert: true }
                );
            }

            await reply(
                `✅ *Prefix successfully changed!*\n\n` +
                `🔸 Old prefix: *${oldPrefix}*\n` +
                `🔸 New prefix: *${newPrefix}*\n\n` +
                `> *BY INCONNU BOY*`
            );
        } catch (e) {
            console.error('Setprefix error:', e);
            await reply(`❌ *Failed to change prefix:* ${e.message}`);
        }
    }
};
