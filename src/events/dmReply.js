/**
 * @file DM Reply Event
 * @description Gère les réponses aux messages privés en transférant automatiquement les réponses vers l'expéditeur original
 * @module events/dmReply
 * @listens messageCreate
 * @requires discord.js
 */
const { EmbedBuilder } = require('discord.js');
const i18n = require('../services/i18nService');

// Map pour stocker les relations: destinataire -> expéditeur original
// Format: Map<userId du destinataire, userId de l'expéditeur>
const dmTracking = new Map();

// Fonction pour ajouter un tracking
function trackDM(recipientId, senderId) {
  dmTracking.set(recipientId, senderId);
  
  // Supprime le tracking après 24 heures
  setTimeout(() => {
    dmTracking.delete(recipientId);
  }, 24 * 60 * 60 * 1000);
}

// Fonction pour obtenir l'expéditeur original
function getOriginalSender(recipientId) {
  return dmTracking.get(recipientId);
}

module.exports = {
  trackDM,
  getOriginalSender,
  
  init: (client) => {
    client.on('messageCreate', async (message) => {
      try {
        // Ignore les messages du bot lui-même
        if (message.author.bot) return;
        
        // Vérifie si c'est un DM
        if (message.channel.type !== 1) return; // 1 = DM
        
        // Vérifie si l'auteur du message est dans le tracking
        const originalSenderId = getOriginalSender(message.author.id);
        
        if (!originalSenderId) return; // Pas de tracking pour cet utilisateur
        
        // Récupère l'expéditeur original
        const originalSender = await client.users.fetch(originalSenderId).catch(() => null);
        
        if (!originalSender) return;
        
        const locale = i18n.defaultLocale; // Default locale for DMs
        const replyEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(i18n.t('events.dm_reply.reply_title', locale))
          .setDescription(i18n.t('events.dm_reply.reply_desc', locale, { user: message.author.username, msg: message.content }))
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: i18n.t('events.dm_reply.from', locale, { tag: message.author.tag }) })
          .setTimestamp();
        
        // Ajoute les pièces jointes s'il y en a
        if (message.attachments.size > 0) {
          const attachments = Array.from(message.attachments.values()).map(att => att.url).join('\n');
          replyEmbed.addFields({ name: i18n.t('events.dm_reply.attachments', locale), value: attachments });
        }
        
        // Envoie au destinataire original
        await originalSender.send({ embeds: [replyEmbed] });
        
        // Confirme la réception
        const confirmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setDescription(i18n.t('events.dm_reply.confirm', locale))
          .setFooter({ text: i18n.t('events.dm_reply.system_footer', locale) });
        
        await message.reply({ embeds: [confirmEmbed] });
        
      } catch {
        // L'erreur est gérée silencieusement - pas besoin de log en production
      }
    });
  }
};
