/**
 * @file Audit Service
 * @description Service de traçage des actions de modération et événements serveur (Audit Logs)
 * @module services/auditService
 */

const { EmbedBuilder } = require('discord.js');
const storageService = require('./storageService');

class AuditService {
  /**
   * Récupère le salon d'audit pour un serveur
   * @param {Object} guild - La guilde Discord
   * @returns {Object|null} Le salon ou null
   */
  async getAuditChannel(guild) {
    const config = storageService.get(guild.id);
    if (!config || !config.audit || !config.audit.enabled || !config.audit.channelId) {
      return null;
    }

    try {
      const channel = await guild.channels.fetch(config.audit.channelId);
      if (channel && channel.isTextBased()) {
        return channel;
      }
    } catch (err) {
      console.error(`[AUDIT] Impossible de trouver le salon d'audit pour ${guild.name}:`, err.message);
    }
    return null;
  }

  /**
   * Log la suppression d'un message
   * @param {Object} message - Le message supprimé
   */
  async logDelete(message) {
    if (!message.guild || message.author?.bot) return;

    const channel = await this.getAuditChannel(message.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ 
        name: `Message Supprimé | ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setDescription(
        `**Auteur:** ${message.author} (\`${message.author.id}\`)\n` +
        `**Salon:** ${message.channel} (\`${message.channel.id}\`)\n\n` +
        `**Contenu:**\n${message.content || '[Pas de contenu texte]'}`
      )
      .setFooter({ text: `ID Message: ${message.id}` })
      .setTimestamp();

    if (message.attachments.size > 0) {
      embed.addFields({ 
        name: 'Pièces jointes', 
        value: `${message.attachments.size} fichier(s)` 
      });
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Log la modification d'un message
   * @param {Object} oldMsg - Ancien message
   * @param {Object} newMsg - Nouveau message
   */
  async logEdit(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return; // Ignore si le contenu n'a pas changé (ex: embed chargé)

    const channel = await this.getAuditChannel(oldMsg.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setAuthor({ 
        name: `Message Modifié | ${oldMsg.author.tag}`, 
        iconURL: oldMsg.author.displayAvatarURL() 
      })
      .setDescription(
        `**Auteur:** ${oldMsg.author} (\`${oldMsg.author.id}\`)\n` +
        `**Salon:** ${oldMsg.channel} (\`${oldMsg.channel.id}\`)\n\n` +
        `**[Lien vers le message](${newMsg.url})**\n\n` +
        `**Ancien contenu:**\n${oldMsg.content || '[Vide]'}\n\n` +
        `**Nouveau contenu:**\n${newMsg.content || '[Vide]'}`
      )
      .setFooter({ text: `ID Message: ${oldMsg.id}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Log l'arrivée d'un membre
   * @param {Object} member - Le membre qui a rejoint
   */
  async logJoin(member) {
    const channel = await this.getAuditChannel(member.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setAuthor({ 
        name: `Nouveau Membre | ${member.user.tag}`, 
        iconURL: member.user.displayAvatarURL() 
      })
      .setDescription(
        `**Utilisateur:** ${member} (\`${member.id}\`)\n` +
        `**Créé le:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Log le départ d'un membre
   * @param {Object} member - Le membre qui a quitté
   */
  async logLeave(member) {
    const channel = await this.getAuditChannel(member.guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setAuthor({ 
        name: `Départ Membre | ${member.user.tag}`, 
        iconURL: member.user.displayAvatarURL() 
      })
      .setDescription(
        `**Utilisateur:** ${member} (\`${member.id}\`)\n` +
        `**Avait rejoint:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Log un mouvement vocal
   * @param {Object} oldState - Ancien état
   * @param {Object} newState - Nouvel état
   */
  async logVoice(oldState, newState) {
    const channel = await this.getAuditChannel(newState.guild);
    if (!channel) return;

    const member = newState.member;
    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: `Vocal | ${member.user.tag}`, 
        iconURL: member.user.displayAvatarURL() 
      })
      .setTimestamp();

    if (!oldState.channel && newState.channel) {
      // Rejoint
      embed.setColor(0x00FFFF).setDescription(`${member} a rejoint le salon **${newState.channel.name}**`);
    } else if (oldState.channel && !newState.channel) {
      // Quitte
      embed.setColor(0xFFB6C1).setDescription(`${member} a quitté le salon **${oldState.channel.name}**`);
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      // Déplace
      embed.setColor(0xEE82EE).setDescription(`${member} s'est déplacé de **${oldState.channel.name}** vers **${newState.channel.name}**`);
    } else {
      return; // Autres changements (mute/deaf) non gérés ici pour éviter le spam
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = new AuditService();
