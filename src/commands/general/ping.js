/**
 * @file Ping Command
 * @description Affiche la latence du bot et la latence de l'API Discord avec indicateur de qualité
 * @module commands/general/ping
 * @category General
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Affiche la latence du bot',
  usage: '!ping',
  
  async execute(message, _args) {
    // Dans CommandHandler, on a injecté context.t et context.locale
    const { t } = arguments[0].t ? arguments[0] : { t: (key, p) => require('../../services/i18nService').t(key, 'fr', p) };
    
    try {
      // Calcule la latence du bot
      const sent = await message.reply(t('ping.calculating'));
      const timeDiff = sent.createdTimestamp - message.createdTimestamp;
      const apiLatency = Math.round(message.client.ws.ping);

      // Détermine la qualité de la connexion
      let quality;
      let color;
      if (timeDiff < 100) {
        quality = t('ping.qualities.excellent');
        color = 0x00FF00;
      } else if (timeDiff < 200) {
        quality = t('ping.qualities.good');
        color = 0xFFFF00;
      } else if (timeDiff < 500) {
        quality = t('ping.qualities.average');
        color = 0xFF9900;
      } else {
        quality = t('ping.qualities.bad');
        color = 0xFF0000;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(t('ping.title'))
        .addFields(
          { name: t('ping.bot_latency'), value: `\`${timeDiff}ms\``, inline: true },
          { name: t('ping.api_latency'), value: `\`${apiLatency}ms\``, inline: true },
          { name: t('ping.quality'), value: `\`${quality}\``, inline: true }
        )
        .setFooter({ text: t('common.requested_by', { user: message.author.username }) })
        .setTimestamp();

      await sent.edit({ content: null, embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande ping:', error);
      message.reply(t('common.error'));
    }
  },
};
