const axios = require("axios");

const API_TOKEN = "VK4fry";

module.exports = {
    name: "google-search",
    category: 7, // Other Commands category
    description: "Search Google for links and get a live webpage screenshot.",
    commands: ["google", "gsearch", "search"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            let textInput = args.join(" ").trim();
            
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!textInput && quoted) {
                textInput = quoted.conversation || quoted.extendedTextMessage?.text || "";
            }

            if (!textInput) {
                return await reply("❌ *Please enter what you want to search.*\n\n💡 _Example: .google Sri Lanka_");
            }

            await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

            const targetUrl = `https://whiteshadow-x-api.onrender.com/api/search/google?q=${encodeURIComponent(textInput)}&apitoken=${API_TOKEN}`;
            
            console.log("[ORION-MD GOOGLE] Fetching search results...");
            const response = await axios.get(targetUrl, { timeout: 30000 });

            if (response.data && response.data.success && response.data.result) {
                const results = response.data.result;
                
                if (results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await reply("❌ *No results found.*");
                }

                let searchMessage = `🔍 *Google Search Results for:* _${textInput}_\n\n`;
                results.forEach((item, index) => {
                    searchMessage += `*${index + 1}. ${item.title}*\n`;
                    searchMessage += `🔗 *Link:* ${item.link}\n`;
                    searchMessage += `📝 _${item.snippet}_\n\n───────────────────\n\n`;
                });
                searchMessage += `> *BY INCONNU BOY*`;

                await reply(searchMessage);

                await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });

                const alternativeSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(textInput)}`;
                
                const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(alternativeSearchUrl)}&width=1280&height=800&output=image&file_type=png`;
                
                console.log("[ORION-MD GOOGLE] Fetching live screenshot from Bing visual...");
                try {
                    const ssResponse = await axios.get(screenshotUrl, {
                        responseType: 'arraybuffer',
                        timeout: 25000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    if (ssResponse.status === 200 && ssResponse.data && ssResponse.data.length > 1000) {
                        const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 ORION-MD\n\n> *BY INCONNU BOY*`;
                        
                        await socket.sendMessage(sender, {
                            image: Buffer.from(ssResponse.data),
                            caption: caption
                        }, { quoted: msg });

                        await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                        return;
                    } else {
                        throw new Error("Failed response from API 1");
                    }

                } catch (ssError) {
                    console.error("[ORION-MD GOOGLE] Screenshot API 1 Failed. Trying Fallback...", ssError.message);
                    
                    try {
                        const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(alternativeSearchUrl)}&screenshot=true&meta=false`;
                        
                        const { data } = await axios.get(fallbackUrl, { timeout: 20000 });
                        const fallbackSsUrl = data?.data?.screenshot?.url;
                        
                        if (fallbackSsUrl) {
                            const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 ORION-MD (Fallback API)\n\n> *BY INCONNU BOY*`;
                            await socket.sendMessage(sender, { image: { url: fallbackSsUrl }, caption: caption }, { quoted: msg });
                            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                        } else {
                            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                        }
                    } catch (fallbackError) {
                        console.error("[ORION-MD GOOGLE] Fallback failed too:", fallbackError.message);
                        await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    }
                }

            } else {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await reply("❌ *Error:* Failed to get data from Google API.");
            }

        } catch (error) {
            console.error("[ORION-MD GOOGLE] Main Error:", error.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return await reply(`❌ *Google Search Error:* ${error.message}`);
        }
    }
};
