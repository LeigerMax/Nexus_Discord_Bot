/**
 * @file ShowDeleted Command
 * @description Affiche les derniers messages supprimés du serveur avec option de filtrage par utilisateur
 * @module commands/admin/showdeleted
 * @category Admin
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'showdeleted',
  description: 'Affiche les derniers messages supprimés',
  usage: '!showdeleted [nombre] [@utilisateur]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie les permissions
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply(t('showdeleted.no_permission'));
      }

      // Récupère l'event messageDelete pour accéder aux données
      const messageDeleteEvent = message.client.eventHandlers?.get('messageDelete');
      
      if (!messageDeleteEvent || !messageDeleteEvent.getDeletedMessages) {
        return message.reply(t('showdeleted.unavailable'));
      }

      // Parse les arguments
      let limit = 10;
      let targetUser = null;

      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && num > 0) {
          limit = Math.min(num, 25); // Max 25
        }
      }

      targetUser = message.mentions.users.size > 0 ? message.mentions.users.values().next().value : null;

      // Récupère les messages supprimés
      const deletedMessages = messageDeleteEvent.getDeletedMessages(limit, targetUser?.id);

      if (deletedMessages.length === 0) {
        return message.reply(t('showdeleted.none_found'));
      }

      // Crée l'embed principal
      const embed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle(t('showdeleted.embed_title'))
        .setDescription(
          t('showdeleted.embed_desc', { 
            count: deletedMessages.length, 
            user: targetUser ? ` de ${targetUser.username}` : '' 
          })
        )
        .setTimestamp();

      // Ajoute chaque message
      for (let i = 0; i < Math.min(deletedMessages.length, 10); i++) {
        const msg = deletedMessages[i];
        
        const timeDiff = Math.floor((Date.now() - msg.deletedAt.getTime()) / 1000);
        let timeStr;
        if (timeDiff < 60) {
          timeStr = `${timeDiff}s`;
        } else if (timeDiff < 3600) {
          timeStr = `${Math.floor(timeDiff / 60)}m`;
        } else {
          timeStr = `${Math.floor(timeDiff / 3600)}h`;
        }

        let content = msg.content;
        if (content.length > 200) {
          content = content.substring(0, 200) + '...';
        }

        let fieldValue = `${t('showdeleted.field_author')}: ${msg.author.username}\n`;
        fieldValue += `${t('showdeleted.field_channel')}: ${msg.channel.name}\n`;
        fieldValue += `${t('showdeleted.field_time')}: ${timeStr}\n`;
        fieldValue += `${t('showdeleted.field_content')}: ${content || t('showdeleted.field_no_text')}`;

        if (msg.attachments.length > 0) {
          fieldValue += `\n📎 **${msg.attachments.length}** ${t('showdeleted.field_attachments')}`;
        }

        embed.addFields({
          name: t('showdeleted.field_name', { index: i + 1 }),
          value: fieldValue,
          inline: false
        });
      }

      if (deletedMessages.length > 10) {
        embed.setFooter({ text: t('showdeleted.footer_more', { count: deletedMessages.length - 10 }) });
      }

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande showdeleted:', error);
      message.reply(t('common.error'));
    }
  }
};
