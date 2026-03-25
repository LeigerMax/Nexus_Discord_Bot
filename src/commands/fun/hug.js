/**
 * @file Hug Command
 * @description Envoie un GIF de câlin à un utilisateur via Giphy API avec mode secret optionnel
 * @module commands/fun/hug
 * @category Fun
 * @requires discord.js
 * @requires node-fetch
 */

const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { trackDM } = require('../../events/dmReply');

module.exports = {
  name: 'hug',
  description: 'Envoie un GIF de câlin à un utilisateur',
  usage: '!hug @utilisateur [secret]',
  
  async execute(message, args) {
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.users.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: '❌ **Erreur**: Tu dois mentionner un utilisateur!\n' +
                   '**Exemple**: `!hug @utilisateur` ou `!hug @utilisateur secret`'
        });
      }

      // Vérifie que l'utilisateur ne se mentionne pas lui-même
      if (mentionedUser.id === message.author.id) {
        return message.reply('❌ Tu ne peux pas te faire un câlin toi-même! 🤗');
      }

      // Vérifie si le mode secret est activé
      const isSecret = args.some(arg => arg.toLowerCase() === 'secret');

      // Récupère un GIF aléatoire depuis Giphy
      const giphyApiKey = process.env.GIPHY_API_KEY;
      const searchTerm = 'hug';
      const url = `https://api.giphy.com/v1/gifs/random?api_key=${giphyApiKey}&tag=${searchTerm}&rating=g`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.data?.images) {
        return message.reply('❌ Impossible de récupérer un GIF pour le moment.');
      }

      const gifUrl = data.data.images.original.url;

      // Supprime le message original
      try {
        await message.delete();
      } catch {
        // Ignorer l'erreur si on ne peut pas supprimer le message
      }

      if (isSecret) {
        // Mode secret : envoie en DM
        const embed = new EmbedBuilder()
          .setColor(0xFF69B4)
          .setDescription(`🤗 **Quelqu'un** t'a envoyé un câlin secret!`)
          .setImage(gifUrl)
          .setFooter({ text: '💌 Message secret' });

        try {
          await mentionedUser.send({ embeds: [embed] });
          
          // Track le DM pour les réponses
          trackDM(mentionedUser.id, message.author.id);
          
          // Confirme l'envoi en DM à l'auteur avec le même GIF
          const confirmEmbed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setDescription(`✅ Ton câlin secret a été envoyé à **${mentionedUser.username}**!`)
            .setImage(gifUrl)
            .setFooter({ text: 'Aperçu du GIF envoyé' });
          await message.author.send({ embeds: [confirmEmbed] });
        } catch {
          await message.channel.send(`❌ Impossible d'envoyer un message privé à ${mentionedUser}.`);
        }
      } else {
        // Mode public : envoie dans le canal avec mention
        const embed = new EmbedBuilder()
          .setColor(0xFF69B4)
          .setDescription(`🤗 <@${message.author.id}> fait un câlin à <@${mentionedUser.id}>!`)
          .setImage(gifUrl);

        await message.channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur dans la commande hug:', error);
      message.reply('❌ Une erreur est survenue lors du traitement de ta commande.');
    }
  },
};
