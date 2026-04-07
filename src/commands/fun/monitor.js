/**
 * @file Monitor Command
 * @description Vérifie l'état de l'écran d'un utilisateur avec résultats aléatoires pondérés
 * @module commands/fun/monitor
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'monitor',
  description: 'Vérifie l\'état de ton écran',
  usage: '!monitor [@utilisateur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie si un utilisateur est mentionné, sinon utilise l'auteur
      const targetUser = message.mentions.users.first() || message.author;
      
      // États possibles de l'écran (Poids et Emojis conservés, Textes traduits)
      const statesConfig = [
        { emoji: '🖥️', color: 0x00FF00, chance: 35 },
        { emoji: '🖥️', color: 0x99FF99, chance: 20 },
        { emoji: '🪟', color: 0xFFFF00, chance: 20 },
        { emoji: '💥', color: 0xFF9900, chance: 15 },
        { emoji: '🔨', color: 0xFF0000, chance: 8 },
        { emoji: '☠️', color: 0x8B0000, chance: 2 }
      ];

      const translatedStates = t('monitor.states');
      const states = statesConfig.map((config, index) => ({
        ...config,
        status: translatedStates[index].status,
        description: translatedStates[index].desc
      }));

      // Sélection pondérée
      const totalChance = states.reduce((sum, state) => sum + state.chance, 0);
      let random = Math.random() * totalChance;
      let selectedState;

      for (const state of states) {
        random -= state.chance;
        if (random <= 0) {
          selectedState = state;
          break;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(selectedState.color)
        .setTitle(t('monitor.title'))
        .setDescription(
          `**${t('wifi.label_player')}**: ${targetUser.username}\n\n` +
          `${selectedState.emoji} **${selectedState.status}**\n` +
          `*${selectedState.description}*`
        )
        .setFooter({ text: t('monitor.footer') })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande monitor:', error);
      message.reply(t('common.error'));
    }
  },
};
