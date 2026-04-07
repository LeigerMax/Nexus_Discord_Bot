/**
 * @file RouletteHard Command
 * @description Sélectionne un joueur aléatoire du salon vocal et applique un timeout de 5 minutes
 * @module commands/fun/roulettehard
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roulettehard',
  description: 'Sélectionne un joueur aléatoire du vocal et l\'exclut 5 minutes',
  usage: '!roulettehard',
  
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

      // Vérifie les permissions
      if (!message.guild.members.me.permissions.has('ModerateMembers')) {
        return message.reply(t('roulettehard.permission_error'));
      }

      if (!randomMember.moderatable) {
        return message.reply(t('roulettehard.permission_error') + ` (${randomMember.user.username})`);
      }

      // Crée un embed pour annoncer le résultat
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(t('roulettehard.embed_title'))
        .setDescription(t('roulettehard.embed_desc', { count: members.size, user: randomMember.user.username, by: message.author.username }))
        .setFooter({ text: t('roulettehard.embed_footer') })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      // Attend 2 secondes pour le suspense
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Exclut le membre pendant 5 minutes (300000 ms)
      try {
        await randomMember.timeout(300000, t('roulettehard.ban_audit'));
        
        const successEmbed = new EmbedBuilder()
          .setColor(0x8B0000)
          .setTitle(t('roulettehard.embed_title'))
          .setDescription(
            t('roulettehard.success_desc', { user: randomMember.user.username }) + `\n\n` +
            `⏱️ **${t('roulette.list_field_time')}**: 5 minutes\n` +
            `🔓 **Retour**: <t:${Math.floor((Date.now() + 300000) / 1000)}:R>`
          )
          .setFooter({ text: 'RIP • F' })
          .setTimestamp();
        
        await message.channel.send({ embeds: [successEmbed] });
      } catch (err) {
        console.error('Erreur lors de l\'exclusion:', err);
        return message.reply(t('roulettehard.permission_error'));
      }

    } catch (error) {
      console.error('Erreur dans la commande roulettehard:', error);
      message.reply(t('common.error'));
    }
  },
};
