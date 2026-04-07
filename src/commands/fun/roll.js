/**
 * @file Roll Command
 * @description Lance un nombre aléatoire entre 1 et 100 avec code couleur selon le résultat
 * @module commands/fun/roll
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roll',
  description: 'Lance un nombre aléatoire entre 1 et 100',
  usage: '!roll',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Génère un nombre aléatoire entre 1 et 100
      const result = Math.floor(Math.random() * 100) + 1;
      
      // Détermine la couleur en fonction du résultat
      let color;
      if (result >= 90) {
        color = 0x00FF00; // Vert pour 90-100
      } else if (result >= 50) {
        color = 0xFFFF00; // Jaune pour 50-89
      } else {
        color = 0xFF0000; // Rouge pour 1-49
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(t('roll.title'))
        .setDescription(`🎯 ${t('roll.result_label', { result })} / 100`)
        .setFooter({ text: t('common.requested_by', { user: message.author.username }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande roll:', error);
      message.reply(t('common.error'));
    }
  },
};
