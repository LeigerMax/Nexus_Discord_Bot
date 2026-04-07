# 🛡️ Nexus Bot v1.0.0

![GitHub release (latest by date)](https://img.shields.io/github/v/release/LeigerMax/Nexus_Discord_Bot?color=7289da&label=Version&logo=discord&logoColor=white&style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/LeigerMax/Nexus_Discord_Bot?color=7289da&style=for-the-badge)

**Nexus Bot** is an all-in-one Discord automation tool designed to transform your server into an interactive, secure, and high-performance space. Manage everything—from YouTube notifications to temporary voice channels—directly through a **modern Web Dashboard**.

---

## 🌐 Nexus Dashboard
Take full control of your bot without any command lines.
- **OAuth2 Authentication**: Secure login via Discord.
- **Real-Time Configuration**: Modify your settings (YouTube, Twitter, Anti-Raid) and watch them apply instantly.
- **Premium Interface**: Sleek dark design with SVG icons and intuitive tab navigation.

---

## ✨ Major Features

### 📺 YouTube System V2
Ultra-stable multi-channel monitoring.
- Automatic handle resolution (`@channel`).
- Customizable announcements for each channel.
- Robust caching system to prevent duplicate notifications.

### 📊 Live Server Statistics
Display your key metrics at the top of your server.
- Total and online member counters via voice channels.
- Automatic updates every 10 minutes.
- REST API implementation to avoid Gateway rate limits (Opcode 8).

### 🎙️ Temporary Voice Channels (Auto-Channels)
Optimize your server space dynamically.
- Join the **"Hub"** channel to create your private voice room instantly.
- Automatic deletion once the channel is empty.
- Custom permissions for the creator.

### 🎫 Ticket Support System
Manage assistance like a pro.
- Open tickets via interactive buttons (`!ticket-setup`).
- Private channels visible only to the author and the Staff team.
- Dedicated categories and secure closing process.

### 💾 Robust Storage (Discord-as-a-DB)
Your configurations travel with your bot.
- Storage via **File Attachments (.json)** to bypass the 2000-character limit.
- No external database required.
- Automatic migration and backward compatibility.

---

## 🎮 Fun & Chaos Commands
Need to entertain your members? Nexus offers over 30 games, memes, and a complete curse system.

👉 **[View the full Fun Commands list here (FR)](COMMANDS_FUN.md)**

---

## 🔧 Installation & Self-Hosting

### Prerequisites
- [Node.js](https://nodejs.org/) v16.11.0 or higher.
- [Discord Developer Portal](https://discord.com/developers/applications): Bot token and Intents enabled (Members, Presence, Content).

### Quick Start
1. **Clone the repository**
   ```bash
   git clone https://github.com/LeigerMax/Nexus_Discord_Bot.git
   cd Nexus_Discord_Bot
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure your `.env`**
   ```env
   DISCORD_TOKEN=your_token
   DISCORD_CLIENT_ID=bot_id
   DISCORD_CLIENT_SECRET=client_secret
   DISCORD_REDIRECT_URI=http://localhost:10000/auth/callback
   STORAGE_CHANNEL_ID=config_channel_id
   ```
4. **Start the bot**
   ```bash
   node src/bot.js
   ```

### 🌍 Self-Hosting Guides
Detailed step-by-step instructions for hosting on platforms like Render, Railway, or VPS:
- 🇺🇸 [**English Self-Hosting Guide**](SELF_HOSTING.md)
- 🇫🇷 [**Guide d'Auto-Hébergement (Français)**](SELF_HOSTING_FR.md)

---

## 🚀 Automatic Updates
Nexus Bot includes a built-in GitHub monitoring system.
- The bot checks daily if a new "Release" is available on GitHub.
- Automatic alerts in your storage channel and a notification banner on the Dashboard.

---

## 🤝 Support & Links
- **Developed by**: [@LeigerMax](https://github.com/LeigerMax)
- **GitHub Repository**: [Nexus_Discord_Bot](https://github.com/LeigerMax/Nexus_Discord_Bot)

---

⭐ **Don't forget to star the repository if you enjoy the project!**
