/**
 * @file Storage Service (Discord-as-a-DB)
 * @description Service pour stocker et gérer les configurations des serveurs dans un salon Discord privé
 * @module services/storageService
 */

const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');

class StorageService {
  constructor() {
    this.client = null;
    this.channelId = null;
    this.cache = new Map(); // guildId -> { config, messageId }
    this.isInitialized = false;
  }

  /**
   * Initialise le service de stockage
   * @param {Object} client - Le client Discord
   * @param {string} channelId - L'ID du salon de stockage
   */
  async init(client, channelId) {
    if (this.isInitialized) return;
    if (!channelId) {
      console.warn("⚠️ STORAGE_CHANNEL_ID manquant dans le .env. Le stockage sera uniquement en mémoire.");
      this.isInitialized = true;
      return;
    }

    this.client = client;
    this.channelId = channelId;

    try {
      // Timeout de 10 secondes pour l'initialisation
      const initPromise = (async () => {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error("Le salon de stockage est invalide ou inaccessible.");
        }

        console.log("📥 Chargement des donn茅es depuis le salon Discord...");
        const messages = await channel.messages.fetch({ limit: 100 });

        for (const msg of messages.values()) {
          try {
            if (msg.content.startsWith('CONFIG_FOR_GUILD:')) {
              const guildId = msg.content.split('\n')[0].split(':')[1];
              let data = null;

              const attachment = msg.attachments.find(a => a.name === 'config.json');
              if (attachment) {
                const response = await axios.get(attachment.url);
                data = response.data;
              } else {
                const lines = msg.content.split('\n');
                data = JSON.parse(lines.slice(1).join('\n'));
              }
              
              if (data) {
                this.cache.set(guildId, {
                  config: data,
                  messageId: msg.id
                });
              }
            }
          } catch (parseError) {
            console.error(`鉁 Erreur de parsing sur le message ${msg.id}:`, parseError.message);
          }
        }
        return true;
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout d'initialisation (10s)")), 10000)
      );

      await Promise.race([initPromise, timeoutPromise]);
      console.log(`鉁 ${this.cache.size} configurations charg茅es.`);
      this.isInitialized = true;
    } catch (error) {
      console.error("鉁 蓘chec de l'initialisation du StorageService:", error.message);
      this.isInitialized = true; // On marque quand m锚me comme init pour ne pas bloquer
    }
  }

  /**
   * Récupère la configuration d'un serveur
   * @param {string} guildId 
   * @returns {Object|null}
   */
  get(guildId) {
    const entry = this.cache.get(guildId);
    return entry ? entry.config : null;
  }

  /**
   * Enregistre la configuration d'un serveur
   * @param {string} guildId 
   * @param {Object} config 
   */
  async set(guildId, config) {
    if (!this.isInitialized || !this.channelId) {
      this.cache.set(guildId, { config });
      return;
    }

    const jsonString = JSON.stringify(config, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(jsonString), { name: 'config.json' });
    const content = `CONFIG_FOR_GUILD:${guildId}`;
    const entry = this.cache.get(guildId);

    try {
      const channel = await this.client.channels.fetch(this.channelId);
      
      if (entry && entry.messageId) {
        try {
          const message = await channel.messages.fetch(entry.messageId);
          // On supprime les anciens fichiers et on envoie les nouveaux (Discord edit ne permet pas de modifier l'attachment facilement par remplacement)
          // Mais dans v14, on peut passer les nouveaux attachments.
          await message.edit({ content, files: [attachment] });
          this.cache.set(guildId, { config, messageId: entry.messageId });
        } catch {
          const newMessage = await channel.send({ content, files: [attachment] });
          this.cache.set(guildId, { config, messageId: newMessage.id });
        }
      } else {
        const newMessage = await channel.send({ content, files: [attachment] });
        this.cache.set(guildId, { config, messageId: newMessage.id });
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde pour le serveur ${guildId}:`, error.message);
    }
  }
}

// Export un singleton
module.exports = new StorageService();
