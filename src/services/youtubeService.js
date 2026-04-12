/**
 * @file YouTube Notification Service (Multi-Channel Support)
 * @description Surveille les flux RSS de plusieurs chaînes YouTube et poste des notifications sur Discord.
 * @module services/youtubeService
 */

const axios = require('axios');
const storageService = require('./storageService');

class YoutubeService {
  constructor(client) {
    this.client = client;
    this.interval = 15 * 60 * 1000; // 15 minutes
    this.timer = null;
  }

  /**
   * Tente de résoudre une URL YouTube ou un handle en channelId technique (UC...)
   * @param {string} input URL, @handle ou ID
   * @returns {Promise<string|null>}
   */
  static async resolveChannelId(input) {
    if (!input) return null;
    input = input.trim();

    // 1. Si c'est déjà un ID valide (commence par UC)
    if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) return input;

    // 2. Construction et validation de l'URL pour éviter SSRF
    let url;
    try {
      if (input.startsWith('@')) {
        url = `https://www.youtube.com/${input}`;
      } else if (input.startsWith('http')) {
        const parsedUrl = new URL(input);
        const allowedDomains = ['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'];
        if (!allowedDomains.includes(parsedUrl.hostname)) {
          console.warn(`[YouTube] Blocage SSRF : tentative d'accès à un domaine non autorisé (${parsedUrl.hostname})`);
          return null;
        }
        url = parsedUrl.toString();
      } else {
        // Par défaut, traite comme un handle
        url = `https://www.youtube.com/@${input.replace(/^@/, '')}`;
      }

      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
        timeout: 5000 // 5 secondes de timeout
      });
      
      // Extraction de l'ID via le tag meta identifier ou browse_id
      const match = response.data.match(/"browse_id":"(UC[a-zA-Z0-9_-]{22})"/);
      if (match) return match[1];

      const metaMatch = response.data.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})">/);
      if (metaMatch) return metaMatch[1];

      return null;
    } catch (error) {
      console.error(`[YouTube] Échec de résolution pour ${input}:`, error.message);
      return null;
    }
  }

  /**
   * Démarre le service de surveillance
   */
  start() {
    console.log('🚀 Service YouTube démarré (Support multi-chaînes)');
    this.checkAll();
    this.timer = setInterval(() => this.checkAll(), this.interval);
  }

  /**
   * Arrête le service
   */
  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkAll() {
    const guilds = this.client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
      const config = storageService.get(guildId);
      
      if (!config?.youtube?.enabled) continue;

      // Migration rétrocompatible
      if (!config.youtube.channels && config.youtube.channelId) {
        config.youtube.channels = [{
          id: config.youtube.channelId,
          discordChannelId: config.youtube.discordChannelId,
          customMessage: config.youtube.customMessage,
          lastVideoId: config.youtube.lastVideoId
        }];
        delete config.youtube.channelId;
        delete config.youtube.discordChannelId;
        delete config.youtube.customMessage;
        delete config.youtube.lastVideoId;
        await storageService.set(guildId, config);
      }

      if (!config.youtube.channels || config.youtube.channels.length === 0) continue;

      // De-duplication locale pour ce cycle (pour ne pas fetcher 10 fois le même RSS si doublons)
      const uniqueChannelIds = [...new Set(config.youtube.channels.map(c => c.id).filter(Boolean))];

      for (const channelId of uniqueChannelIds) {
        try {
          await this.checkChannel(guild, channelId);
        } catch (error) {
          console.error(`[YouTube] Erreur pour ${channelId} sur ${guild.name}:`, error.message);
        }
      }
    }
  }

  async checkChannel(guild, channelId) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    const response = await axios.get(rssUrl).catch(() => null);
    if (!response || !response.data) return;

    const videoIdMatch = response.data.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = response.data.match(/<title>(.*?)<\/title>/g); 
    const authorMatch = response.data.match(/<name>(.*?)<\/name>/);

    if (!videoIdMatch) return;

    const latestVideoId = videoIdMatch[1];
    const videoTitle = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<\/?title>/g, '') : 'Nouvelle vidéo';
    const authorName = authorMatch ? authorMatch[1] : 'YouTube';

    const fullConfig = storageService.get(guild.id);
    if (!fullConfig?.youtube?.channels) return;

    // Trouver toutes les entrées qui correspondent à cet ID de chaîne
    const matchingConfigs = fullConfig.youtube.channels.filter(c => c.id === channelId);
    let needsUpdate = false;

    for (const channelConfig of matchingConfigs) {
      // Initialisation silencieuse si pas encore d'ID stocké
      if (!channelConfig.lastVideoId) {
        channelConfig.lastVideoId = latestVideoId;
        needsUpdate = true;
        continue;
      }

      if (latestVideoId !== channelConfig.lastVideoId) {
        console.log(`[YouTube] Nouvelle vidéo détectée pour ${authorName} sur ${guild.name}: ${latestVideoId}`);
        
        const discordChannel = guild.channels.cache.get(channelConfig.discordChannelId);
        if (discordChannel) {
          const videoUrl = `https://www.youtube.com/watch?v=${latestVideoId}`;
          let messageText = channelConfig.customMessage || '🔴 Nouvelle vidéo : **{title}**\n👉 {link}';
          
          messageText = messageText
            .replace(/{link}/g, videoUrl)
            .replace(/{title}/g, videoTitle)
            .replace(/{author}/g, authorName)
            .replace(/{channel}/g, channelId);

          await discordChannel.send(messageText).catch(e => console.error(`[YouTube] Erreur d'envoi Discord: ${e.message}`));
        }
        channelConfig.lastVideoId = latestVideoId;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // On sauvegarde la config avec les nouveaux IDs pour toutes les entrées correspondantes
      await storageService.set(guild.id, fullConfig);
    }
  }
}

module.exports = YoutubeService;
