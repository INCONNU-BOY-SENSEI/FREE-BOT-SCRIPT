# ORION-MD

ORION-MD is an open-source, multi-device WhatsApp bot built on [Baileys](https://github.com/WhiskeySockets/Baileys). It pairs with WhatsApp using a phone-number pairing code (no QR scanning required), loads commands through a plugin system, and ships with a clean single-page web UI for pairing.

This repository is meant to be forked. The codebase is organized so you can find, understand, and extend any part of it without digging through one giant file.

```
MADE IN BY INCONNU BOY SENSEI
```

---

## Project structure

```
ORION-MD/
├── index.js              # Entry point — single Express server
├── inconnu/               # Core bot engine
│   ├── connection.js       # Session/pairing, socket lifecycle, built-in commands
│   ├── cmd.js               # Plugin loader, category menu, command lookup
│   ├── group.js              # Shared group/admin helper functions
│   └── msg.js                  # Message parsing & media download helpers
├── inconnuboy/             # Plugins (15 included by default)
├── public/
│   └── index.html          # Pairing web page (single origin, no CORS, no ads)
├── apt.txt                 # System packages needed on some hosts (ffmpeg)
├── .env.example             # Environment variable template
└── package.json
```

### Why this split?

- **`inconnu/`** is the engine — the parts every install needs regardless of which plugins are enabled: pairing/session handling, the plugin loader, group-related helpers, and message utilities.
- **`inconnuboy/`** is where features live. Every file in here is a self-contained plugin. Drop a new one in, and it's picked up automatically — no need to touch the engine.
- **`public/`** is the web front end. It's served by the same Express server that handles pairing, so there's no second server, no CORS configuration, and no cross-origin requests to manage.

---

## Requirements

- Node.js 20 or newer
- A MongoDB database (used to persist paired sessions) — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works fine
- `ffmpeg` available on the system (see `apt.txt` if you're deploying on a platform that reads it)

---

## Setup

1. **Clone your fork**

   ```bash
   git clone https://github.com/<your-username>/ORION-MD.git
   cd ORION-MD
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure your environment**

   Copy the example file and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   | Variable         | Required | Description                                                          |
   |------------------|----------|------------------------------------------------------------------------|
   | `MONGODB_URI`    | Yes      | Your MongoDB connection string. The bot will not start without it.    |
   | `PORT`           | No       | Port to run the server on. Defaults to `8000`.                         |
   | `OWNER_NUMBER`   | No       | Your WhatsApp number (digits only), used for owner-only commands.      |
   | `NEWSLETTER_JID` | No       | A WhatsApp channel JID to auto-react to, if you use that feature.      |
   | `CHANNEL_LINK`   | No       | A link shown in some bot messages.                                      |
   | `PM2_NAME`       | No       | Process name used for auto-restart if you run the bot under PM2.        |

   > **Never commit your `.env` file.** It's already listed in `.gitignore`. Treat your `MONGODB_URI` like a password — anyone who has it can read and modify every paired session in your database.

4. **Start the bot**

   ```bash
   npm start
   ```

5. **Pair your number**

   Open `http://localhost:8000` (or your deployed URL) in a browser, enter your WhatsApp number with country code and no `+` or spaces, and submit. You'll get a pairing code — enter it in WhatsApp under **Settings → Linked Devices → Link a Device → Link with phone number instead**.

---

## Included plugins

ORION-MD ships with 15 plugins in `inconnuboy/`, covering the essentials: session/group protection, media conversion, downloaders, and search. This keeps the default install lean — add more plugins as you need them.

| Plugin             | Commands                                   | What it does                                              |
|---------------------|----------------------------------------------|---------------------------------------------------------------|
| `antidelete.js`     | `.ad`, `.antidelete`                          | Recovers messages that were deleted for everyone              |
| `antilink.js`       | `.antilink`                                   | Deletes/warns/kicks members who post group invite links       |
| `welcome.js`        | `.welcome`                                    | Toggles welcome & goodbye messages                              |
| `emoji_dl.js`       | `.emojidl`                                    | Downloads status updates via emoji reaction                     |
| `once_dl.js`        | `.oncedl`                                     | Downloads view-once media via emoji reaction                    |
| `autolike.js`       | `.autolike`, `.autoview`, `.likeemoji`         | Auto-views and auto-reacts to contacts' status updates          |
| `settings.js`       | `.settings`, `.panel`, `.mode`, `.btnmode`     | Bot configuration panel                                          |
| `setprefix.js`      | `.setprefix`                                  | Changes the bot's command prefix                                  |
| `sticker.js`        | `.s`, `.x`, `.sticker`                         | Converts an image or video into a sticker                         |
| `toimage.js`        | `.toimage`, `.toimg`                          | Converts a sticker back into an image                             |
| `mp3.js`            | `.mp3`, `.toaudio`                            | Extracts audio from a video                                        |
| `dl.js`             | `.dl`, `.download`, `.directdl`                | Downloads a direct file URL as a WhatsApp document                 |
| `ig.js`             | `.ig`, `.insta`, `.instagram`                  | Downloads Instagram reels, posts, and carousels                    |
| `tiktoksearch.js`   | `.ts`, `.tiktoksearch`, `.tsearch`             | Searches TikTok and returns results as a card grid                 |
| `google.js`         | `.google`, `.gsearch`, `.search`               | Searches Google and returns a screenshot of the results            |

Everything else — download menu commands, AI commands, group management (`.kick`, `.promote`, `.tagall`, etc.), and the menu system itself — is part of the core engine in `inconnu/connection.js`, so it's always available even with zero plugins installed.

---

## Writing your own plugin

Drop a new file into `inconnuboy/`. It's picked up automatically the next time the plugin loader runs (on boot, and again a moment after any file change while the bot is running).

```js
module.exports = {
    name: "ping",
    category: "other",
    description: "Replies with pong",
    commands: ["ping"],
    handler: async ({ reply }) => {
        await reply("pong");
    }
};
```

The `handler` receives a context object with everything you'll typically need: `socket`, `msg`, `sender`, `command`, `args`, `reply`, `isGroup`, `isOwner`, `senderNumber`, `botNumber`, and more. For group-related checks (is this user an admin, is the bot an admin), use the shared helpers in `inconnu/group.js`:

```js
const Group = require('../inconnu/group');

const isAdmin = await Group.isGroupAdmin(socket, sender, userJid);
```

---

## Deploying

ORION-MD runs anywhere Node.js and outbound network access are available: a VPS, Render, Railway, Fly.io, or similar. Platforms that read `apt.txt` will install `ffmpeg` automatically; otherwise install it yourself on the host.

Because sessions are persisted to MongoDB, restarting or redeploying the bot does not require re-pairing.

---

## Security notes

- `MONGODB_URI` grants full read/write access to every paired session in your database. Keep it in `.env` (never in code, never committed) and rotate it if it's ever exposed.
- The pairing web page is public by default. Anyone who can reach it can attempt to pair a number, so consider putting it behind authentication or IP restrictions if you deploy it publicly.
- Session data in MongoDB is equivalent to being logged into the paired WhatsApp account. Treat your database with the same care as an authentication system.

---

## Contributing

Forks and pull requests are welcome. If you build a plugin you think others would find useful, open a PR against `inconnuboy/`.

## License

MIT — see `LICENSE`.

---

```
MADE IN BY INCONNU BOY SENSEI
```
