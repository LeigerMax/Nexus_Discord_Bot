/**
 * @file Rage Command
 * @description Calcule le niveau de rage actuel d'un utilisateur avec un pourcentage aléatoire
 * @module commands/fun/rage
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rage',
  description: 'Calcule ton niveau de rage actuel',
  usage: '!rage [@utilisateur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie si un utilisateur est mentionné, sinon utilise l'auteur
      const targetUser = message.mentions.users.first() || message.author;
      
      // Génère un niveau de rage entre 0 et 100
      const rageLevel = Math.floor(Math.random() * 101);
      
      // Détermine l'état et l'emoji selon le niveau
      let status, emoji, color;
      
      const states = t('rage.states');

      if (rageLevel <= 20) {
        emoji = '😌';
        status = states[0];
        color = 0x00FF00;
      } else if (rageLevel <= 40) {
        emoji = '😐';
        status = states[1];
        color = 0x99FF99;
      } else if (rageLevel <= 60) {
        emoji = '😠';
        status = states[2];
        color = 0xFFFF00;
      } else if (rageLevel <= 80) {
        emoji = '😡';
        status = states[3];
        color = 0xFF9900;
      } else if (rageLevel <= 95) {
        emoji = '🤬';
        status = states[4];
        color = 0xFF0000;
      } else {
        emoji = '💢';
        status = states[5];
        color = 0x8B0000;
      }

      // Crée une barre de progression
      const barLength = 20;
      const filledLength = Math.floor((rageLevel / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(t('rage.title'))
        .setDescription(`${emoji} **${targetUser.username}**\n\n${bar} **${rageLevel}%**\n\n*${status}*`)
        .setFooter({ text: t('rage.footer') })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande rage:', error);
      message.reply(t('common.error'));
    }
  },
};
