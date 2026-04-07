/**
 * @file Clear Command
 * @description Supprime des messages en masse dans un salon (jusqu'à 100 messages)
 * @module commands/admin/clear
 * @category Admin
 * @requires discord.js
 */

module.exports = {
  name: 'clear',
  description: 'Supprime un nombre de messages spécifié (max 100)',
  usage: '!clear <nombre> [mention]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie les permissions
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply(t('clear.no_permission'));
      }

      // Vérifie qu'un nombre est fourni
      const amount = parseInt(args[0]);
      
      if (!amount || isNaN(amount) || amount < 1) {
        return message.reply({
          content: t('clear.invalid_amount') + '\n' +
                   t('clear.example')
        });
      }

      if (amount > 100) {
        return message.reply(t('clear.limit_error'));
      }

      // Vérifie si on filtre par utilisateur
      const targetUser = message.mentions.users.size > 0 ? message.mentions.users.values().next().value : null;
      
      // Récupère les messages
      const fetchedMessages = await message.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
      
      let messagesToDelete = fetchedMessages;
      
      // Filtre par utilisateur si mention
      if (targetUser) {
        // Utilise filter qui existe sur les Collections Discord.js
        messagesToDelete = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
      }

      // Supprime les messages (Discord limite à 14 jours)
      const deleted = await message.channel.bulkDelete(messagesToDelete, true);

      // Message de confirmation
      const msgText = targetUser 
        ? t('clear.success_user', { count: deleted.size, user: targetUser.username })
        : t('clear.success_generic', { count: deleted.size });

      const confirmMsg = await message.channel.send(msgText);

      // Supprime le message de confirmation après 5 secondes
      setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);

    } catch (error) {
      console.error('Erreur dans la commande clear:', error);
      
      if (error.code === 50034) {
        return message.reply(t('clear.old_messages_error'));
      }
      
      message.reply(t('common.error'));
    }
  }
};
