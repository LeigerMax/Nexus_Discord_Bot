# 🚀 Self-Hosting Guide (English)

This guide explains how to host your own instance of this Discord bot for free using **Render** and **UptimeRobot**.

---

## 1. Create a Discord Application

1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **New Application** and give it a name.
3.  In the **Bot** tab:
    *   Retrieve your **Token** (click "Reset Token" if necessary).
    *   Check the **Privileged Gateway Intents**:
        *   ✅ Presence Intent
        *   ✅ Server Members Intent
        *   ✅ Message Content Intent
4.  In the **OAuth2** -> **General** tab:
    *   Retrieve your **Client ID** and **Client Secret**.
    *   Under **Redirects**, add the following URL: `http://localhost:10000/auth/callback` (for local tests) and `https://your-app.render.com/auth/callback` (for Render).

---

## 2. Prepare Storage (No Database)

The bot needs a private Discord channel to save its configuration data:
1.  Create a private text channel on your server.
2.  Ensure the bot has permissions to **Read**, **Send**, and **Edit** messages in this channel.
3.  Right-click the channel and click **Copy ID** (Enable Developer Mode in your Discord settings if you don't see this). This ID will be your `STORAGE_CHANNEL_ID`.

---

## 3. Configure the `.env` file

Create a `.env` file in the project's root directory with this information:

```env
DISCORD_TOKEN=your_bot_token
STORAGE_CHANNEL_ID=your_private_channel_id
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-app.render.com/auth/callback
SESSION_SECRET=a_long_random_secret_string
PORT=10000
```

---

## 4. Hosting on Render (Free)

1.  Create an account on [Render](https://render.com/).
2.  Create a new **Web Service** and connect your GitHub repository.
3.  Configure the following settings:
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node src/bot.js`
4.  In the **Environment** tab, add all variables from your `.env`.

---

## 5. Keep-Alive with UptimeRobot

Render's free tier services "sleep" after 15 minutes of inactivity. To prevent this:
1.  Create a free account on [UptimeRobot](https://uptimerobot.com/).
2.  Add a new monitor:
    *   **Monitor Type**: HTTP(s)
    *   **Friendly Name**: Discord Bot Dashboard
    *   **URL**: Your Render application URL (e.g., `https://your-bot.onrender.com/`)
    *   **Monitoring Interval**: Every **5 minutes**.
3.  This way, UptimeRobot will "wake up" your bot every 5 minutes, keeping it online 24/7!

---

## 6. Access the Dashboard

Once deployed, visit your Render application URL. You'll be able to log in with your Discord account and configure your servers directly through the web interface!
