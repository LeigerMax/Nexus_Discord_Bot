/**
 * @file Spam Command
 * @description Spam un joueur avec des mentions dans le salon et DM puis supprime tout automatiquement
 * @module commands/fun/spam
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'spam',
  description: 'Spam un joueur avec des mentions puis supprime tout',
  usage: '!spam @utilisateur [durée_en_secondes]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: t('hug.mention_error').replace('!hug', '!spam')
        });
      }

      // Parse la durée (en secondes)
      let durationInSeconds = 60; // Par défaut 60 secondes
      const timeArg = args.find(arg => !arg.startsWith('<@') && !isNaN(arg));
      
      if (timeArg) {
        const parsedTime = parseInt(timeArg);
        if (parsedTime < 1) {
          return message.reply(t('spam.error_min_duration'));
        }
        durationInSeconds = parsedTime;
      }

      const duration = durationInSeconds * 1000; // Convertir en millisecondes

      // Confirmation avant le spam
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle(t('spam.confirm_title'))
        .setDescription(t('spam.confirm_desc', { 
          target: mentionedUser.username, 
          author: message.author.username, 
          duration: durationInSeconds 
        }))
        .setFooter({ text: t('spam.confirm_footer') });

      await message.reply({ embeds: [confirmEmbed] });

      // Tableau pour stocker les IDs des messages créés
      const spamMessages = [];
      const startTime = Date.now();

      // Supprime le message original
      try {
        await message.delete();
      } catch (err) {
        console.log('Impossible de supprimer le message original:', err.message);
      }

      // Messages de spam variés (traduits)
      const spamTexts = t('spam.texts', { target: mentionedUser.toString() });

      // GIFs pour les DM
      const spamGifs = [
        'https://i.giphy.com/QBd2kLB5qDmysEXre9.webp',
        'https://i.giphy.com/l0HlQ7LRalQqdWfao.webp',
        'https://i.giphy.com/H6cmWzp6LGFvqjidB7.webp'
      ];

      // Fonction de spam en DM avec GIF toutes les 10 secondes
      const dmSpamInterval = setInterval(async () => {
        if (Date.now() - startTime >= duration) {
          clearInterval(dmSpamInterval);
          return;
        }

        try {
          const randomGif = spamGifs[Math.floor(Math.random() * spamGifs.length)];
          const gifEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(t('spam.dm_desc', { author: message.author.username }))
            .setImage(randomGif)
            .setFooter({ text: t('spam.dm_footer') });
          
          await mentionedUser.send({ embeds: [gifEmbed] });
        } catch (err) {
          console.log('Impossible d\'envoyer un DM à l\'utilisateur:', err.message);
        }
      }, 10000); // Toutes les 10 secondes

      // Fonction de spam
      const spamInterval = setInterval(async () => {
        // Vérifie si la durée est écoulée
        if (Date.now() - startTime >= duration) {
          clearInterval(spamInterval);
          clearInterval(dmSpamInterval); // Arrête aussi le spam en DM
          
          // Attendre un peu avant de nettoyer
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Supprime tous les messages de spam
          let deletedCount = 0;
          for (const msgId of spamMessages) {
            try {
              const msg = await message.channel.messages.fetch(msgId);
              await msg.delete();
              deletedCount++;
            } catch {
              // Ignorer si le message a déjà été supprimé ou si permissions insuffisantes
            }
          }

          // Message de fin
          const endEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(t('spam.end_desc', { count: deletedCount }))
            .setFooter({ text: t('spam.end_footer', { target: mentionedUser.username, author: message.author.username }) });

          const finalMsg = await message.channel.send({ embeds: [endEmbed] });
          
          // Supprime le message de fin après 5 secondes
          setTimeout(() => {
            finalMsg.delete().catch(() => {});
          }, 5000);

          return;
        }

        // Envoie un message de spam
        try {
          const randomText = spamTexts[Math.floor(Math.random() * spamTexts.length)];
          const spamMsg = await message.channel.send(randomText);
          spamMessages.push(spamMsg.id);
        } catch (err) {
          console.error('Erreur lors de l\'envoi du spam:', err);
        }
      }, 2000); // Envoie un message toutes les 2 secondes

    } catch (error) {
      console.error('Erreur dans la commande spam:', error);
      message.reply(t('common.error'));
    }
  },
};
