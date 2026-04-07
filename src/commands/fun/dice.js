/**
 * @file Dice Command
 * @description Lance un dé à 6 faces et affiche le résultat
 * @module commands/fun/dice
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'dice',
  description: 'Lance un dé à 6 faces',
  usage: '!dice',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Génère un nombre aléatoire entre 1 et 6
      const result = Math.floor(Math.random() * 6) + 1;
      
      // Emojis de dés
      const diceEmojis = {
        1: '⚀',
        2: '⚁',
        3: '⚂',
        4: '⚃',
        5: '⚄',
        6: '⚅'
      };

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('dice.title'))
        .setDescription(`${diceEmojis[result]} ${t('dice.result_label', { result })}`)
        .setFooter({ text: t('common.requested_by', { user: message.author.username }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande dice:', error);
      message.reply(t('common.error'));
    }
  },
};
