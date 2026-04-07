/**
 * @file Roulette Command
 * @description Sélectionne un joueur aléatoire du salon vocal et le déconnecte (roulette russe)
 * @module commands/fun/roulette
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roulette',
  description: 'Sélectionne un joueur aléatoire du vocal et le déconnecte',
  usage: '!roulette',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie que l'utilisateur est dans un salon vocal
      if (!message.member.voice.channel) {
        return message.reply({
          content: t('roulette.no_voice')
        });
      }

      const voiceChannel = message.member.voice.channel;
      
      // Récupère tous les membres du salon vocal (sauf les bots)
      const members = voiceChannel.members.filter(member => !member.user.bot);
      
      if (members.size === 0) {
        return message.reply(t('roulette.no_players'));
      }

      if (members.size === 1) {
        return message.reply(t('roulette.alone'));
      }

      // Sélectionne un membre aléatoire
      const randomMember = members.random();

      // Crée un embed pour annoncer le résultat
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(t('roulette.embed_title'))
        .setDescription(t('roulette.embed_desc', { count: members.size, user: randomMember.user.username, by: message.author.username }))
        .setFooter({ text: t('roulette.embed_footer') })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      // Attend 2 secondes pour le suspense
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Déconnecte le membre sélectionné
      try {
        await randomMember.voice.disconnect(t('roulette.audit_reason'));
        
        const successEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setDescription(t('roulette.success_desc', { user: randomMember.user.username }))
          .setTimestamp();
        
        await message.channel.send({ embeds: [successEmbed] });
      } catch (err) {
        console.error('Erreur lors de la déconnexion:', err);
        return message.reply(t('roulette.permission_error'));
      }

    } catch (error) {
      console.error('Erreur dans la commande roulette:', error);
      message.reply(t('common.error'));
    }
  },
};
