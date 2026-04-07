/**
 * @file Antiraid Command
 * @description Système anti-raid personnalisable pour protéger le serveur contre les raids massifs
 * @module commands/admin/antiraid
 * @category Admin
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');
const storageService = require('../../services/storageService');
const i18n = require('../../services/i18nService');

// Tracking des joins récents (garde uniquement en mémoire vive)
const recentJoins = new Map();

// Garbage collector: nettoie les anciennes entrées toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [guildId, joins] of recentJoins) {
    const filtered = joins.filter(j => now - j.timestamp < 60000); // Garde uniquement les joins de la dernière minute
    if (filtered.length === 0) {
      recentJoins.delete(guildId);
    } else {
      recentJoins.set(guildId, filtered);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  name: 'antiraid',
  description: 'Configure le système anti-raid du serveur',
  usage: '!antiraid <on|off|config|status>',
  
  async execute(message, args, context) {
    const { t, locale } = context;
    try {
      // Vérifie les permissions
      if (!message.member.permissions.has('Administrator')) {
        return message.reply(t('antiraid.no_admin'));
      }

      const subCommand = args[0]?.toLowerCase();

      if (!subCommand || subCommand === 'status') {
        return this.showStatus(message, t);
      }

      switch (subCommand) {
        case 'on':
          return await this.enableAntiRaid(message, t);
        
        case 'off':
          return await this.disableAntiRaid(message, t);
        
        case 'config':
          return await this.configureAntiRaid(message, args.slice(1), t);
        
        default:
          return message.reply({
            content: t('antiraid.invalid_subcommand') + '\n' +
                     t('antiraid.available_commands') + '\n' +
                     `\`!antiraid on\` - ${t('antiraid.help_on')}\n` +
                     `\`!antiraid off\` - ${t('antiraid.help_off')}\n` +
                     `\`!antiraid config <option> <valeur>\` - ${t('antiraid.help_config')}\n` +
                     `\`!antiraid status\` - ${t('antiraid.help_status')}\n\n` +
                     t('antiraid.config_options') + '\n' +
                     '`joinLimit <nombre>` - (défaut: 5)\n' +
                     '`joinWindow <secondes>` - (défaut: 10)\n' +
                     '`action <kick|ban>` - (défaut: kick)\n' +
                     '`autoLock <true|false>` - (défaut: true)'
          });
      }

    } catch (error) {
      console.error('Erreur dans la commande antiraid:', error);
      message.reply(t('common.error'));
    }
  },

  async enableAntiRaid(message, t) {
    const guildId = message.guild.id;
    let fullConfig = storageService.get(guildId) || {};
    
    fullConfig.antiraid = fullConfig.antiraid || {
      enabled: true,
      joinLimit: 5,
      joinWindow: 10000,
      action: 'kick',
      autoLock: true,
      locked: false
    };

    fullConfig.antiraid.enabled = true;
    fullConfig.antiraid.locked = false;

    await storageService.set(guildId, fullConfig);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(t('antiraid.enabled_title'))
      .setDescription(t('antiraid.enabled_desc'))
      .addFields(
        { name: t('antiraid.config_label'), value: this.getConfigText(fullConfig.antiraid, t) }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async disableAntiRaid(message, t) {
    const guildId = message.guild.id;
    let fullConfig = storageService.get(guildId);
    
    if (fullConfig && fullConfig.antiraid) {
      fullConfig.antiraid.enabled = false;
      fullConfig.antiraid.locked = false;
      await storageService.set(guildId, fullConfig);
    }

    return message.reply(t('antiraid.disabled'));
  },

  async configureAntiRaid(message, args, t) {
    const guildId = message.guild.id;
    let fullConfig = storageService.get(guildId) || {};
    
    fullConfig.antiraid = fullConfig.antiraid || {
      enabled: false,
      joinLimit: 5,
      joinWindow: 10000,
      action: 'kick',
      autoLock: true,
      locked: false
    };

    const config = fullConfig.antiraid;
    const option = args[0]?.toLowerCase();
    const value = args[1];

    if (!option) {
      return message.reply(t('antiraid.config_specify_option'));
    }

    switch (option) {
      case 'joinlimit': {
        const limit = parseInt(value, 10);
        if (!limit || limit < 1 || limit > 20) {
          return message.reply(t('antiraid.config_joinlimit_error'));
        }
        config.joinLimit = limit;
        await message.reply(t('antiraid.config_joinlimit_success', { limit }));
        break;
      }

      case 'joinwindow': {
        const window = parseInt(value, 10);
        if (!window || window < 1) {
          return message.reply(t('antiraid.config_joinwindow_error'));
        }
        config.joinWindow = window * 1000;
        await message.reply(t('antiraid.config_joinwindow_success', { window }));
        break;
      }

      case 'action':
        if (value !== 'kick' && value !== 'ban') {
          return message.reply(t('antiraid.config_action_error'));
        }
        config.action = value;
        await message.reply(t('antiraid.config_action_success', { action: value }));
        break;

      case 'autolock':
        if (value !== 'true' && value !== 'false') {
          return message.reply(t('antiraid.config_autolock_error'));
        }
        config.autoLock = value === 'true';
        await message.reply(t('antiraid.config_autolock_success', { status: config.autoLock ? 'ON' : 'OFF' }));
        break;

      default:
        return message.reply(t('antiraid.config_invalid_option'));
    }

    await storageService.set(guildId, fullConfig);
  },

  showStatus(message, t) {
    const guildId = message.guild.id;
    const fullConfig = storageService.get(guildId);
    const config = fullConfig?.antiraid;

    const embed = new EmbedBuilder()
      .setColor(config?.enabled ? 0x00FF00 : 0xFF0000)
      .setTitle(t('antiraid.status_title'))
      .setDescription(
        config?.enabled 
          ? t('antiraid.status_active') + (config.locked ? t('antiraid.status_locked') : '')
          : t('antiraid.status_disabled')
      )
      .setTimestamp();

    if (config) {
      embed.addFields(
        { name: t('antiraid.config_label'), value: this.getConfigText(config, t) }
      );
    }

    return message.reply({ embeds: [embed] });
  },

  getConfigText(config, t) {
    return t('antiraid.config_text_limit', { limit: config.joinLimit, window: config.joinWindow / 1000 }) + '\n' +
           t('antiraid.config_text_action', { action: config.action }) + '\n' +
           t('antiraid.config_text_autolock', { status: config.autoLock ? 'YES' : 'NO' });
  },

  // Fonction appelée par l'event guildMemberAdd
  async checkRaid(guild, member) {
    const locale = i18n.getGuildLocale(guild.id);
    const t = (key, params) => i18n.t(key, locale, params);

    const fullConfig = storageService.get(guild.id);
    const config = fullConfig?.antiraid;
    
    if (!config || !config.enabled || config.locked) return;

    const now = Date.now();
    
    if (!recentJoins.has(guild.id)) {
      recentJoins.set(guild.id, []);
    }

    const joins = recentJoins.get(guild.id);
    
    // Ajoute le nouveau join
    joins.push({ userId: member.id, timestamp: now });

    // Nettoie les anciens joins
    const filtered = joins.filter(j => now - j.timestamp < config.joinWindow);
    recentJoins.set(guild.id, filtered);

    // Vérifie si raid détecté
    if (filtered.length >= config.joinLimit) {
      console.log(`[ANTI-RAID] Raid détecté sur ${guild.name}! ${filtered.length} joins en ${config.joinWindow / 1000}s`);
      
      // Action sur tous les membres récents
      for (const join of filtered) {
        try {
          const targetMember = await guild.members.fetch(join.userId).catch(() => null);
          if (!targetMember) continue;

          if (config.action === 'ban') {
            await targetMember.ban({ reason: t('antiraid.raid_detected_title') });
          } else {
            await targetMember.kick(t('antiraid.raid_detected_title'));
          }
        } catch (err) {
          console.error('Erreur action anti-raid:', err);
        }
      }

      // Verrouille le serveur si activé
      if (config.autoLock) {
        config.locked = true;
        await storageService.set(guild.id, fullConfig);
        
        // Trouve un salon pour notifier
        const channels = guild.channels.cache.filter(c => c.type === 0);
        const notifChannel = channels.first();
        
        if (notifChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(t('antiraid.raid_detected_title'))
            .setDescription(
              t('antiraid.raid_detected_desc', { count: filtered.length, window: config.joinWindow / 1000 }) + '\n\n' +
              t('antiraid.raid_action_performed', { action: config.action }) + '\n' +
              t('antiraid.raid_autolock_notif') + '\n\n' +
              t('antiraid.raid_unlock_instruction')
            )
            .setTimestamp();

          await notifChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      // Nettoie les joins
      recentJoins.set(guild.id, []);
    }
  },

  // Export de la config pour l'event
  getConfig(guildId) {
    const fullConfig = storageService.get(guildId);
    return fullConfig?.antiraid;
  }
};
