/**
 * @file Auto Command
 * @description Envoie un message automatiquement à intervalle régulier dans un salon
 * @module commands/admin/auto
 * @category Admin
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

// Stockage des intervalles actifs (Map<channelId, { interval: NodeJS.Timeout, message: string, intervalSeconds: number, startTime: number, guildId: string }>)
const activeIntervals = new Map();

module.exports = {
  name: 'auto',
  description: 'Envoie un message automatiquement tous les X secondes',
  usage: '!auto <temps_en_secondes> <message> OU !auto stop',
  
  // Exposer les intervalles pour le Dashboard
  getIntervals() {
    const list = [];
    for (const [channelId, data] of activeIntervals) {
      list.push({
        channelId,
        guildId: data.guildId,
        message: data.message,
        interval: data.intervalSeconds,
        startTime: data.startTime
      });
    }
    return list;
  },

  // Arrêter un intervalle depuis le Dashboard
  stopInterval(channelId) {
    if (activeIntervals.has(channelId)) {
      const data = activeIntervals.get(channelId);
      clearInterval(data.interval);
      activeIntervals.delete(channelId);
      return true;
    }
    return false;
  },

  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie les permissions
      if (!message.member.permissions.has('Administrator')) {
        return message.reply(t('auto.no_admin'));
      }

      const channelId = message.channel.id;

      // Commande pour arrêter l'auto-message
      if (args[0] === 'stop') {
        if (this.stopInterval(channelId)) {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(t('auto.stopped'));
          
          return message.reply({ embeds: [embed] });
        } else {
          return message.reply(t('auto.no_active'));
        }
      }

      // Vérifie les arguments
      if (args.length < 2) {
        return message.reply({
          content: t('auto.incorrect_usage') + '\n' +
                   t('auto.example') + '\n' +
                   t('auto.stop_hint')
        });
      }

      const intervalSeconds = parseInt(args[0]);
      const autoMessage = args.slice(1).join(' ');

      // Validation du temps
      if (Number.isNaN(intervalSeconds) || intervalSeconds < 1) {
        return message.reply(t('auto.time_error'));
      }

      // Validation du message
      if (autoMessage.length < 1) {
        return message.reply(t('auto.empty_error'));
      }

      if (autoMessage.length > 500) {
        return message.reply(t('auto.too_long_error'));
      }

      // Arrête l'ancien intervalle s'il existe
      this.stopInterval(channelId);

      // Crée le nouvel intervalle
      const intervalObj = setInterval(() => {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(`🔔 ${autoMessage}`)
          .setFooter({ text: t('auto.embed_footer', { seconds: intervalSeconds }) })
          .setTimestamp();

        message.channel.send({ embeds: [embed] }).catch(err => {
          console.error('Erreur lors de l\'envoi du message automatique:', err);
          this.stopInterval(channelId);
        });
      }, intervalSeconds * 1000);

      // Enregistre l'intervalle avec métadonnées
      activeIntervals.set(channelId, {
        interval: intervalObj,
        message: autoMessage,
        intervalSeconds: intervalSeconds,
        startTime: Date.now(),
        guildId: message.guild.id
      });

      // Confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(t('auto.enabled_title'))
        .setDescription(t('auto.enabled_desc', { message: autoMessage, seconds: intervalSeconds }))
        .setFooter({ text: t('auto.stop_instr') });

      await message.reply({ embeds: [confirmEmbed] });

    } catch (error) {
      console.error('Erreur dans la commande auto:', error);
      message.reply(t('common.error'));
    }
  },
};
