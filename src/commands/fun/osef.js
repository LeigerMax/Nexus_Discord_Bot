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
  
  async execute(message, args) {
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: '❌ **Erreur**: Tu dois mentionner un utilisateur!\n' +
                   '**Exemple**: `!osef @utilisateur` ou `!osef @utilisateur secret`'
        });
      }

      // Vérifie que l'utilisateur ne se mentionne pas lui-même
      if (mentionedUser.id === message.author.id) {
        return message.reply('❌ Tu ne peux pas te dire "osef" à toi-même! 😂');
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
        return message.reply('❌ Impossible de récupérer un GIF pour le moment.');
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
          .setDescription(`🤷 **Quelqu'un** dit qu'on s'en fout royalement!`)
          .setImage(gifUrl)
          .setFooter({ text: '💌 Message secret' });

        try {
          await mentionedUser.send({ embeds: [embed] });
          
          // Track le DM pour les réponses
          trackDM(mentionedUser.id, message.author.id);
          
          // Confirme l'envoi en DM à l'auteur avec le même GIF
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x808080)
            .setDescription(`✅ Ton message "osef" secret a été envoyé à **${mentionedUser.username}**!`)
            .setImage(gifUrl)
            .setFooter({ text: 'Aperçu du GIF envoyé' });
          await message.author.send({ embeds: [confirmEmbed] });
        } catch {
          await message.channel.send(`❌ Impossible d'envoyer un message privé à ${mentionedUser}.`);
        }
      } else {
        // Mode public : envoie dans le canal avec mention
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setDescription(`🤷 <@${message.author.id}> dit à <@${mentionedUser.id}> : **On s'en fout royalement!**`)
          .setImage(gifUrl);

        await message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur dans la commande osef:', error);
      message.reply('❌ Une erreur est survenue lors du traitement de ta commande.');
    }
  },
};
