/**
 * @file Stats Service
 * @description Gère la mise à jour des salons de statistiques du serveur
 * @module services/statsService
 */

const storageService = require('./storageService');

class StatsService {
  /**
   * Met à jour les salons de statistiques pour un serveur
   * @param {Object} guild - La guilde Discord
   */
  async updateStats(guild) {
    const config = storageService.get(guild.id);
    if (!config || !config.stats || !config.stats.enabled) return;

    const { totalChannelId, onlineChannelId } = config.stats;

    // Mise à jour du total des membres
    if (totalChannelId) {
      try {
        const totalChannel = await guild.channels.fetch(totalChannelId);
        if (totalChannel) {
          const newName = `📊 Membres: ${guild.memberCount}`;
          if (totalChannel.name !== newName) {
            await totalChannel.setName(newName);
          }
        }
      } catch (err) {
        console.error(`[STATS] Erreur totalChannel pour ${guild.name}:`, err.message);
      }
    }

    // Mise à jour des membres en ligne
    if (onlineChannelId) {
      try {
        const onlineChannel = await guild.channels.fetch(onlineChannelId);
        if (onlineChannel) {
          // Utilise le fetch REST avec counts pour éviter de spam le Gateway (Opcode 8)
          // Le bot évite ainsi d'être banni temporairement par Discord pour trop de requêtes
          const guildWithCounts = await guild.client.guilds.fetch({ guild: guild.id, withCounts: true });
          const onlineCount = guildWithCounts.approximatePresenceCount || 0;
          
          const newName = `🟢 En ligne: ${onlineCount}`;
          if (onlineChannel.name !== newName) {
            await onlineChannel.setName(newName);
          }
        }
      } catch (err) {
        console.error(`[STATS] Erreur onlineChannel pour ${guild.name}:`, err.message);
      }
    }
  }

  /**
   * Initialise une tâche périodique pour mettre à jour les stats "En ligne"
   * @param {Object} client - Le client Discord
   */
  initAutoUpdate(client) {
    // Toutes les 10 minutes pour éviter d'être rate-limited par Discord (limite sur setName)
    setInterval(() => {
      client.guilds.cache.forEach(guild => {
        this.updateStats(guild).catch(() => { });
      });
    }, 10 * 60 * 1000);
  }
}

module.exports = new StatsService();
