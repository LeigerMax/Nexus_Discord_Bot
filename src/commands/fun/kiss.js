/**
 * @file Kiss Command
 * @description Envoie un GIF de bisou à un utilisateur via Giphy API avec mode secret optionnel
 * @module commands/fun/kiss
 * @category Fun
 * @requires discord.js
 * @requires node-fetch
 */

const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { trackDM } = require('../../events/dmReply');

module.exports = {
  name: 'kiss',
  description: 'Envoie un GIF de bisou à un utilisateur',
  usage: '!kiss @utilisateur [secret]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: t('kiss.mention_error')
        });
      }

      // Vérifie que l'utilisateur ne se mentionne pas lui-même
      if (mentionedUser.id === message.author.id) {
        return message.reply(t('kiss.self_error'));
      }

      // Vérifie si le mode secret est activé
      const isSecret = args.some(arg => arg.toLowerCase() === 'secret');

      // Récupère un GIF aléatoire depuis Giphy
      const giphyApiKey = process.env.GIPHY_API_KEY;
      const searchTerm = 'kiss';
      const url = `https://api.giphy.com/v1/gifs/random?api_key=${giphyApiKey}&tag=${searchTerm}&rating=g`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.data || !data.data.images) {
        return message.reply(t('hug.giphy_error'));
      }

      const gifUrl = data.data.images.original.url;

      // Supprime le message original
      try {
        await message.delete();
      } catch {
        // Ignorer l'erreur si on ne peut pas supprimer le message ping
      }

      if (isSecret) {
        // Mode secret : envoie en DM
        const embed = new EmbedBuilder()
          .setColor(0xFF1493)
          .setDescription(t('kiss.secret_desc'))
          .setImage(gifUrl);

        const secretFooter = t('hug.secret_footer');
        if (secretFooter) embed.setFooter({ text: secretFooter });

        try {
          await mentionedUser.send({ embeds: [embed] });
          
          // Track le DM pour les réponses
          trackDM(mentionedUser.id, message.author.id);
          
          // Confirme l'envoi en DM à l'auteur avec le même GIF
          const confirmEmbed = new EmbedBuilder()
            .setColor(0xFF1493)
            .setDescription(t('kiss.confirm_desc', { user: mentionedUser.username }))
            .setImage(gifUrl);

          const confirmFooter = t('hug.confirm_footer');
          if (confirmFooter) confirmEmbed.setFooter({ text: confirmFooter });
          await message.author.send({ embeds: [confirmEmbed] });
        } catch {
          await message.channel.send(t('hug.dm_error', { user: mentionedUser }));
        }
      } else {
        // Mode public : envoie dans le canal avec mention
        const embed = new EmbedBuilder()
          .setColor(0xFF1493)
          .setDescription(t('kiss.public_desc', { author: message.author.id, target: mentionedUser.id }))
          .setImage(gifUrl);

        await message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur dans la commande kiss:', error);
      message.reply(t('common.error'));
    }
  },
};
