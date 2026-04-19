/**
 * @file Osef Command
 * @description Envoie un GIF "on s'en fout royalement" à un utilisateur via Giphy API avec mode secret optionnel
 * @module commands/fun/osef
 * @category Fun
 * @requires discord.js
 * @requires node-fetch
 */

const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { trackDM } = require('../../events/dmReply');

module.exports = {
  name: 'osef',
  description: 'Envoie un GIF "on s\'en fout royalement" à un utilisateur',
  usage: '!osef @utilisateur [secret]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: t('hug.mention_error').replace('!hug', '!osef')
        });
      }

      // Vérifie que l'utilisateur ne se mentionne pas lui-même
      if (mentionedUser.id === message.author.id) {
        return message.reply(t('hug.self_error').replace('🤗', '😂'));
      }

      // Vérifie si le mode secret est activé
      const isSecret = args.some(arg => arg.toLowerCase() === 'secret');

      // Récupère un GIF aléatoire depuis Giphy
      const giphyApiKey = process.env.GIPHY_API_KEY;
      const searchTerm = 'dont care shrug whatever';
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
      } catch (err) {
        console.log('Impossible de supprimer le message:', err.message);
      }

      if (isSecret) {
        // Mode secret : envoie en DM
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setDescription(t('osef.secret_desc'))
          .setImage(gifUrl);

        const secretFooter = t('hug.secret_footer');
        if (secretFooter) embed.setFooter({ text: secretFooter });

        try {
          await mentionedUser.send({ embeds: [embed] });
          
          // Track le DM pour les réponses
          trackDM(mentionedUser.id, message.author.id);
          
          // Confirme l'envoi en DM à l'auteur avec le même GIF
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x808080)
            .setDescription(t('osef.confirm_desc', { user: mentionedUser.username }))
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
          .setColor(0x808080)
          .setDescription(t('osef.public_desc', { author: message.author.id, target: mentionedUser.id }))
          .setImage(gifUrl);

        await message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur dans la commande osef:', error);
      message.reply(t('common.error'));
    }
  },
};
