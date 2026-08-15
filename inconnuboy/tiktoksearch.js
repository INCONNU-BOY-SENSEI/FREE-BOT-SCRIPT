const axios = require("axios");
const {
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto,
} = require("baileys"); 

const API_TOKEN = process.env.WHITESHADOW_API_TOKEN || "VK4fry";
const WHITESHADOW_API = "https://whiteshadow-x-api.onrender.com/api/search/tiktok";
const TIKWM_SEARCH_API = "https://tikwm.com/api/feed/search";

const MAX_RESULTS = 5; 
const MAX_VIDEO_MB = 80;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

const EMOJI_SEARCH = "\uD83D\uDD0D";
const EMOJI_SUCCESS = "\u26A1";
const EMOJI_ERROR = "\u274C";
const EMOJI_DOWNLOAD = "\uD83D\uDCE5";
const OUTER_HEADER_TITLE = toFullWidth("ORION MD");
const OUTER_FOOTER_TEXT = "| POWERED BY INCONNU BOY";
const CARD_FOOTER_TEXT = "ORION MD";

function toFullWidth(text) {
    return String(text).replace(/[A-Z0-9.]/g, (char) => {
        if (char === ".") return "\uFF0E";
        return String.fromCharCode(char.charCodeAt(0) + 0xfee0);
    });
}

function truncateText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}\u2026`;
}

function pickResultsArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.results)) return payload.data.results;
    if (Array.isArray(payload?.data?.videos)) return payload.data.videos;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
}

function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function toAbsoluteTikwmUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `https://tikwm.com${url}`;
    return url;
}

function createProto(type, value) {
    if (type?.fromObject) return type.fromObject(value);
    if (type?.create) return type.create(value);
    return value;
}

function buildTikTokPageUrl(video) {
    const id = pickFirstString(video.id, video.video_id, video.aweme_id);
    const username = pickFirstString(
        video.author?.unique_id,
        video.author?.username,
        video.author_unique_id,
        video.username,
        video.unique_id
    );

    if (id && username) return `https://www.tiktok.com/@${username}/video/${id}`;
    return "";
}

function normalizeVideo(rawVideo, index) {
    const title = pickFirstString(
        rawVideo.title,
        rawVideo.caption,
        rawVideo.desc,
        rawVideo.description,
        rawVideo.text,
        `TikTok Result ${index + 1}`
    );
    const author = pickFirstString(
        rawVideo.author?.nickname,
        rawVideo.author?.unique_id,
        rawVideo.nickname,
        rawVideo.username
    );
    const body = pickFirstString(
        rawVideo.caption,
        rawVideo.desc,
        rawVideo.description,
        rawVideo.hashtags,
        author ? `Creator: ${author}` : "",
        title
    );
    const thumbnail = toAbsoluteTikwmUrl(
        pickFirstString(
            rawVideo.thumbnail,
            rawVideo.cover,
            rawVideo.dynamic_cover,
            rawVideo.origin_cover,
            rawVideo.image,
            rawVideo.thumb
        )
    );
    
    const directVideo = toAbsoluteTikwmUrl(
        pickFirstString(
            rawVideo.hdplay,       // Priority 1: HD Quality (720p/1080p)
            rawVideo.play,         // Priority 2: Normal Quality
            rawVideo.no_watermark,
            rawVideo.nowm,
            rawVideo.nwm_video_url,
            rawVideo.video,
            rawVideo.video_url,
            rawVideo.play_url,
            rawVideo.download,
            rawVideo.download_url,
            rawVideo.wmplay
        )
    );
    const pageUrl = pickFirstString(
        rawVideo.url,
        rawVideo.link,
        rawVideo.share_url,
        rawVideo.shareUrl,
        rawVideo.webpage_url,
        buildTikTokPageUrl(rawVideo)
    );

    return {
        title,
        body,
        thumbnail,
        directVideo,
        url: pageUrl || directVideo,
    };
}

async function fetchWhiteShadowResults(searchQuery) {
    const endpoint = `${WHITESHADOW_API}?query=${encodeURIComponent(searchQuery)}&apitoken=${API_TOKEN}&hd=1`;
    const { data } = await axios.get(endpoint, { timeout: 15000 });
    return pickResultsArray(data).map(normalizeVideo);
}

async function fetchTikwmResults(searchQuery) {
    const body = new URLSearchParams({
        keywords: searchQuery,
        count: String(MAX_RESULTS),
        cursor: "0",
        hd: "1" // 🔥 HD ඉල්ලන්න Parameter එක දැම්මා
    });

    const { data } = await axios.post(TIKWM_SEARCH_API, body, {
        timeout: 15000,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
            Referer: "https://tikwm.com/",
        },
    });

    return pickResultsArray(data).map(normalizeVideo);
}

async function fetchTikTokResults(searchQuery) {
    try {
        console.log(`Searching TikTok via TikWM for: ${searchQuery}`);
        const videos = await fetchTikwmResults(searchQuery);
        const usable = videos.filter((video) => video.url && video.directVideo).slice(0, MAX_RESULTS);
        if (usable.length) return usable;
    } catch (error) {
        console.error("TikWM Search API error:", error.message);
    }

    console.log(`Searching TikTok via WhiteShadow for: ${searchQuery}`);
    const videos = await fetchWhiteShadowResults(searchQuery);
    const usable = videos.filter((video) => video.url && video.directVideo).slice(0, MAX_RESULTS);

    if (!usable.length) throw new Error("No downloadable TikTok videos found");
    return usable;
}

async function downloadVideoBuffer(url) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 25000,
        maxContentLength: MAX_VIDEO_BYTES,
        maxBodyLength: MAX_VIDEO_BYTES,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
            Referer: "https://tikwm.com/",
            Accept: "video/mp4,video/*,*/*",
        },
    });

    const buffer = Buffer.from(response.data);
    if (!buffer.length) throw new Error("Downloaded video buffer is empty");
    if (buffer.length > MAX_VIDEO_BYTES) {
        throw new Error(`Video is bigger than ${MAX_VIDEO_MB}MB`);
    }

    return buffer;
}

async function prepareVideoHeader(socket, video) {
    if (!video.directVideo) throw new Error("Missing direct video URL");

    console.log(`Downloading carousel video buffer for: ${video.title}`);
    const buffer = await downloadVideoBuffer(video.directVideo);
    
    const media = await prepareWAMessageMedia(
        {
            video: buffer,
            mimetype: "video/mp4",
        },
        {
            upload: socket.waUploadToServer, 
        }
    );

    if (!media.videoMessage) throw new Error("Baileys did not create videoMessage");

    media.videoMessage.mimetype = "video/mp4";
    media.videoMessage.gifPlayback = false;

    return media.videoMessage;
}

async function buildCarouselCards(socket, videos) {
    const InteractiveMessage = proto.Message.InteractiveMessage;
    const cards = [];

    for (const video of videos) {
        try {
            const videoMessage = await prepareVideoHeader(socket, video);
            const card = createProto(InteractiveMessage, {
                header: createProto(InteractiveMessage.Header, {
                    title: truncateText(video.title, 30),
                    hasMediaAttachment: true,
                    videoMessage,
                }),
                body: createProto(InteractiveMessage.Body, {
                    text: truncateText(video.body, 60),
                }),
                footer: createProto(InteractiveMessage.Footer, {
                    text: CARD_FOOTER_TEXT,
                }),
                nativeFlowMessage: createProto(InteractiveMessage.NativeFlowMessage, {
                    buttons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: `${EMOJI_DOWNLOAD} Download Video`,
                                id: `.tt ${video.url}`, 
                            }),
                        },
                    ],
                }),
            });

            cards.push(card);
        } catch (error) {
            console.error(`TS video card skipped: ${video.title}`, error.message);
        }
    }

    return cards;
}

module.exports = {
    name: "tiktok-carousel-search",
    category: 1, 
    description: "Search TikTok videos and display in a beautiful HD carousel grid.",
    commands: ["ts", "tiktoksearch", "tsearch"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const searchQuery = args.join(" ").trim();

        if (!searchQuery) {
            return reply(`${EMOJI_ERROR} *Usage:* \`.ts sadew\` හෝ \`.ts trending\``);
        }

        try {
            await socket.sendMessage(sender, { react: { text: EMOJI_SEARCH, key: msg.key } });

            const videos = await fetchTikTokResults(searchQuery);

            try {
                const InteractiveMessage = proto.Message.InteractiveMessage;
                const CarouselMessage = InteractiveMessage?.CarouselMessage || proto.Message.CarouselMessage;

                const cards = await buildCarouselCards(socket, videos);
                if (!cards.length) throw new Error("Could not process any video cards");

                const interactiveMessage = createProto(InteractiveMessage, {
                    header: createProto(InteractiveMessage.Header, {
                        title: OUTER_HEADER_TITLE,
                        hasMediaAttachment: false,
                    }),
                    body: createProto(InteractiveMessage.Body, {
                        text: `${EMOJI_SEARCH} *TikTok Search:* _${searchQuery}_\n> HD වීඩියෝවක් තෝරා Download බටන් එක ඔබන්න.`,
                    }),
                    footer: createProto(InteractiveMessage.Footer, {
                        text: OUTER_FOOTER_TEXT,
                    }),
                    carouselMessage: createProto(CarouselMessage, {
                        cards,
                        messageVersion: 1,
                    }),
                });

                const message = generateWAMessageFromContent(
                    sender,
                    {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadata: {},
                                    deviceListMetadataVersion: 2,
                                },
                                interactiveMessage,
                            },
                        },
                    },
                    { quoted: msg }
                );

                await socket.relayMessage(sender, message.message, {
                    messageId: message.key.id,
                });

            } catch (carouselError) {
                console.error("TS video carousel failed, sending fallback:", carouselError);
                
                const lines = [
                    `${EMOJI_SEARCH} *TikTok search results for:* _${searchQuery}_`,
                    "",
                    ...videos.slice(0, MAX_RESULTS).map((video, index) => {
                        const title = truncateText(video.title || `TikTok Result ${index + 1}`, 80);
                        return `*${index + 1}.* ${title}\n🔗 ${video.url}`;
                    }),
                    `\n> *BY INCONNU BOY*`
                ];
                await reply(lines.join("\n\n"));
            }

            await socket.sendMessage(sender, { react: { text: EMOJI_SUCCESS, key: msg.key } });

        } catch (error) {
            console.error("Main TS Command Error:", error);
            await socket.sendMessage(sender, { react: { text: EMOJI_ERROR, key: msg.key } });

            return reply(
                `${EMOJI_ERROR} *TikTok search failed.*\n_Reason: ${
                    error?.response?.data?.message || error.message || "Unknown Error"
                }_`
            );
        }
    }
};
