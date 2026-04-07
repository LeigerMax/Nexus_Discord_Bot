/**
 * @file Brain Command
 * @description Vérifie si le cerveau d'un utilisateur est allumé, éteint, en lag, etc.
 * @module commands/fun/brain
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'brain',
  description: 'Vérifie si ton cerveau est allumé',
  usage: '!brain [@utilisateur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie si un utilisateur est mentionné, sinon utilise l'auteur
      const targetUser = message.mentions.users.first() || message.author;
      
      // États possibles du cerveau (Couleurs et Emojis conservés, Textes traduits)
      const statesConfig = [
        { emoji: '🧠✅', color: 0x00FF00 },
        { emoji: '🧠❌', color: 0xFF0000 },
        { emoji: '🧠⚡', color: 0xFFFF00 },
        { emoji: '🧠💤', color: 0x808080 },
        { emoji: '🧠🔥', color: 0xFF6600 },
        { emoji: '🧠🐌', color: 0x996633 },
        { emoji: '🧠🎲', color: 0x9966FF },
        { emoji: '🧠☕', color: 0x8B4513 }
      ];

      const translatedStates = t('brain.states');
      const states = statesConfig.map((config, index) => ({
        ...config,
        status: translatedStates[index].status,
        description: translatedStates[index].desc
      }));

      // Sélectionne un état aléatoire
      const selectedState = states[Math.floor(Math.random() * states.length)];

      const embed = new EmbedBuilder()
        .setColor(selectedState.color)
        .setTitle(t('brain.title'))
        .setDescription(
          `**${t('wifi.label_player')}**: ${targetUser.username}\n\n` +
          `${selectedState.emoji} **${selectedState.status}**\n` +
          `*${selectedState.description}*`
        )
        .setFooter({ text: t('brain.footer') })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande brain:', error);
      message.reply(t('common.error'));
    }
  },
};
