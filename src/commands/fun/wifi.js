/**
 * @file Wifi Command
 * @description Vérifie la qualité de la connexion internet d'un utilisateur avec résultats aléatoires pondérés
 * @module commands/fun/wifi
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'wifi',
  description: 'Vérifie la qualité de ta connexion',
  usage: '!wifi [@utilisateur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie si un utilisateur est mentionné, sinon utilise l'auteur
      const targetUser = message.mentions.users.first() || message.author;
      
      // États possibles de connexion (Poids et codes conservés, textes traduits)
      const statesConfig = [
        { ping: '12', color: 0x00FF00, chance: 15 },
        { ping: '35', color: 0x00FF00, chance: 20 },
        { ping: '89', color: 0xFFFF00, chance: 25 },
        { ping: '145', color: 0xFF9900, chance: 20 },
        { ping: '240', color: 0xFF0000, chance: 15 },
        { ping: '999', color: 0x8B0000, chance: 4 },
        { ping: '∞', color: 0x000000, chance: 1 }
      ];

      const translatedStates = t('wifi.states');
      const states = statesConfig.map((config, index) => ({
        ...config,
        emoji: '📶',
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

      // Crée des barres de signal
      const signalBars = selectedState.ping === '∞' || parseInt(selectedState.ping) > 200 
        ? '▂▁▁' 
        : parseInt(selectedState.ping) > 100 
        ? '▂▄▁' 
        : '▂▄▆█';

      const embed = new EmbedBuilder()
        .setColor(selectedState.color)
        .setTitle(t('wifi.title'))
        .setDescription(
          `${t('wifi.label_player')}: ${targetUser.username}\n\n` +
          `${selectedState.emoji} **${selectedState.ping} ms** ${signalBars}\n\n` +
          `${t('wifi.label_status')}: ${selectedState.status}\n` +
          `*${selectedState.description}*`
        )
        .setFooter({ text: t('wifi.footer') })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande wifi:', error);
      message.reply(t('common.error'));
    }
  },
};
