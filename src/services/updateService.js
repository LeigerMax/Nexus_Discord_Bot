/**
 * @file Update Service
 * @description Vérifie les nouvelles versions sur GitHub et notifie l'administrateur
 * @module services/updateService
 */

const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class UpdateService {
  constructor() {
    this.repo = 'LeigerMax/Nexus_Discord_Bot';
    this.currentVersion = require('../config/version.json').current;
    this.lastCheck = 0;
    this.latestAvailable = null;
  }

  /**
   * Vérifie si une mise à jour est disponible
   * @param {Object} client - Le client Discord
   * @param {boolean} silent - Si vrai, ne pas envoyer de message Discord
   */
  async checkForUpdates(client, silent = false) {
    try {
      console.log(`🔍 Vérification des mises à jour (${this.repo})...`);
      
      const response = await axios.get(`https://api.github.com/repos/${this.repo}/releases/latest`, {
        headers: { 'User-Agent': 'Nexus-Bot-Update-Checker' }
      });

      const latest = response.data;
      const latestVersion = latest.tag_name.replace('v', '');
      this.latestAvailable = latest;

      if (this.isNewer(latestVersion, this.currentVersion)) {
        console.log(`📢 Nouvelle version disponible : v${latestVersion}`);
        
        if (!silent) {
          await this.notifyAdmin(client, latest);
        }
        return latest;
      } else {
        console.log(`✅ Le bot est à jour (v${this.currentVersion})`);
        return null;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`✅ Le bot est à jour (v${this.currentVersion}) - Aucun release public trouvé.`);
        return null;
      }
      console.error('[UPDATE] Erreur lors de la vérification :', error.message);
      return null;
    }
  }

  /**
   * Compare deux versions sémantiques
   * @param {string} latest 
   * @param {string} current 
   */
  isNewer(latest, current) {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (l[i] > (c[i] || 0)) return true;
        if (l[i] < (c[i] || 0)) return false;
    }
    return false;
  }

  /**
   * Envoie une notification dans le salon de stockage
   * @param {Object} client 
   * @param {Object} release 
   */
  async notifyAdmin(client, release) {
    const channelId = process.env.STORAGE_CHANNEL_ID;
    if (!channelId) return;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🚀 Nouvelle Mise à Jour Disponible !')
        .setDescription(`Une nouvelle version de **Nexus Bot** est disponible sur GitHub.\n\n**Version :** \`${release.tag_name}\`\n**Nom :** ${release.name}`)
        .addFields(
          { name: '📝 Notes de version', value: release.body.substring(0, 500) + (release.body.length > 500 ? '...' : '') }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Voir sur GitHub')
          .setURL(release.html_url)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Télécharger .zip')
          .setURL(release.zipball_url)
          .setStyle(ButtonStyle.Link)
      );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('[UPDATE] Erreur notification :', err.message);
    }
  }

  /**
   * Retourne les infos de la dernière version pour le Dashboard
   */
  getLatestInfo() {
    return this.latestAvailable;
  }
}

module.exports = new UpdateService();
