/**
 * @file Keyboard Command
 * @description Vérifie l'état du clavier d'un utilisateur avec résultats aléatoires pondérés
 * @module commands/fun/keyboard
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'keyboard',
  description: 'Vérifie l\'état de ton clavier',
  usage: '!keyboard [@utilisateur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie si un utilisateur est mentionné, sinon utilise l'auteur
      const targetUser = message.mentions.users.first() || message.author;
      
      // États possibles du clavier (Poids et Emojis conservés, Textes traduits)
      const statesConfig = [
        { emoji: '⌨️', color: 0x00FF00, chance: 30 },
        { emoji: '⌨️', color: 0x99FF99, chance: 20 },
        { emoji: '⌨️', color: 0xFFFF00, chance: 20 },
        { emoji: '⌨️', color: 0xFF9900, chance: 15 },
        { emoji: '🔥', color: 0xFF0000, chance: 10 },
        { emoji: '💀', color: 0x8B0000, chance: 5 }
      ];

      const translatedStates = t('keyboard.states');
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
        .setTitle(t('keyboard.title'))
        .setDescription(
          `**${t('wifi.label_player')}**: ${targetUser.username}\n\n` +
          `${selectedState.emoji} **${selectedState.status}**\n` +
          `*${selectedState.description}*`
        )
        .setFooter({ text: t('keyboard.footer') })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande keyboard:', error);
      message.reply(t('common.error'));
    }
  },
};
