/**
 * @file Coach Command
 * @description Fournit un conseil de coach gaming aléatoire, sérieux ou troll
 * @module commands/fun/coach
 * @category Fun
 * @requires discord.js
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'coach',
  description: 'Reçois un conseil de coach gaming',
  usage: '!coach',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Liste de conseils variés (traduits)
      const advicesData = t('coach.advices');
      
      // Ajout des emojis (non traduits car universels ou spécifiques au code original)
      const emojis = [
        '🗺️', '🔫', '🛡️', '🎙️', '☕', '🖱️', '🎯', '⚡', '⚔️', '👁️',
        '😈', '📍', '💀', '💰', '✨', '💬', '🚪', '🦶', '🤡', '🔇', '🚀',
        '🧘', '💧', '🌳'
      ];

      const advices = advicesData.map((advice, index) => ({
        ...advice,
        emoji: emojis[index] || '💡'
      }));

      // Sélectionne un conseil aléatoire
      const advice = advices[Math.floor(Math.random() * advices.length)];

      const types = t('coach.types');
      const translatedType = types[advice.type] || advice.type;

      // Couleur selon le type
      let color;
      if (advice.type === 'serious') {
        color = 0x00FF00;
      } else if (advice.type === 'troll') {
        color = 0xFF0000;
      } else if (advice.type === 'mental') {
        color = 0x00BFFF;
      } else {
        color = 0x808080;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(t('coach.title'))
        .setDescription(
          `${advice.emoji} **"${advice.text}"**\n\n` +
          `*${t('coach.category_label')}: ${translatedType}*`
        )
        .setFooter({ text: t('coach.footer', { user: message.author.username }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande coach:', error);
      message.reply(t('common.error'));
    }
  },
};
