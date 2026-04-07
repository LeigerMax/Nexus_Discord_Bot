/**
 * @file Coin Command
 * @description Lance une pièce de monnaie aléatoire - Pile ou Face
 * @module commands/fun/coin
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'coin',
  description: 'Lance une pièce - Pile ou Face',
  usage: '!coin',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Résultats possibles
      const results = [t('coin.heads'), t('coin.tails')];
      const result = results[Math.floor(Math.random() * results.length)];
      

      const embed = new EmbedBuilder()
        .setColor(result === t('coin.heads') ? 0xFFD700 : 0xC0C0C0)
        .setTitle(t('coin.title'))
        .setDescription(t('coin.result_label', { result }))
        .setFooter({ text: t('common.requested_by', { user: message.author.username }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande coin:', error);
      message.reply(t('common.error'));
    }
  },
};
