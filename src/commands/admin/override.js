/**
 * @file Override Command
 * @description Commande KING pour forcer l'arrêt de toutes les malédictions, mutes et sanctions actives
 * @module commands/admin/override
 * @category Admin
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'override',
  description: '[KING ONLY] Force l\'arrêt de toutes les malédictions, mutes et sanctions',
  usage: '!override <curse|mute|roulettemute|all> [@utilisateur|all]',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie que c'est le KING (lecture dynamique de process.env)
      const KING_ID = process.env.KING_ID;
      if (message.author.id !== KING_ID) {
        return message.reply(t('override.no_king'));
      }

      const action = args[0]?.toLowerCase();
      const target = args[1]?.toLowerCase();

      if (!action) {
        return message.reply({
          content: t('override.help_title') + '\n\n' +
                   t('override.help_syntax') + '\n\n' +
                   t('override.help_types') + '\n' +
                   t('override.help_type_curse') + '\n' +
                   t('override.help_type_mute') + '\n' +
                   t('override.help_type_roulette') + '\n' +
                   t('override.help_type_all') + '\n\n' +
                   t('override.help_targets') + '\n' +
                   t('override.help_target_user') + '\n' +
                   t('override.help_target_all') + '\n\n' +
                   t('override.help_examples') + '\n' +
                   t('override.help_example1') + '\n' +
                   t('override.help_example2')
        });
      }

      const mentionedUser = message.mentions.users.size > 0 ? message.mentions.users.values().next().value : null;
      const affectAll = target === 'all' || !mentionedUser;

      let results = {
        cursesRemoved: 0,
        mutesRemoved: 0,
        rouletteMutesRemoved: 0
      };

      // Récupère les modules via commandHandler
      const commands = message.client.commandHandler?.commands;
      if (!commands) {
        return message.reply(t('override.access_error'));
      }
      
      const curseCommand = commands.get('curse');
      const muteCommand = commands.get('mute');
      const roulettemuteCommand = commands.get('roulettemute');

      // Override CURSE
      if (action === 'curse' || action === 'all') {
        if (curseCommand && curseCommand.cursedPlayers) {
          const cursedPlayers = curseCommand.cursedPlayers;
          
          if (affectAll) {
            // Nettoie tous les timeouts avant de clear
            for (const curseData of cursedPlayers.values()) {
              if (curseData.timeout) clearTimeout(curseData.timeout);
            }
            results.cursesRemoved = cursedPlayers.size;
            cursedPlayers.clear();
          } else if (mentionedUser) {
            if (cursedPlayers.has(mentionedUser.id)) {
              const curseData = cursedPlayers.get(mentionedUser.id);
              if (curseData.timeout) clearTimeout(curseData.timeout);
              cursedPlayers.delete(mentionedUser.id);
              results.cursesRemoved = 1;
            }
          }
        }
      }

      // Override MUTE
      if (action === 'mute' || action === 'all') {
        if (muteCommand && muteCommand.mutedMembers) {
          const mutedMembers = muteCommand.mutedMembers;
          
          if (affectAll) {
            for (const [userId, muteData] of mutedMembers) {
              try {
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (member && member.voice.channel) {
                  await member.voice.setMute(false, t('override.audit_reason'));
                }
                if (muteData.interval) clearInterval(muteData.interval);
              } catch (err) {
                console.error('Erreur démute:', err);
              }
            }
            results.mutesRemoved = mutedMembers.size;
            mutedMembers.clear();
          } else if (mentionedUser) {
            if (mutedMembers.has(mentionedUser.id)) {
              const muteData = mutedMembers.get(mentionedUser.id);
              if (muteData.interval) clearInterval(muteData.interval);
              
              const member = await message.guild.members.fetch(mentionedUser.id).catch(() => null);
              if (member && member.voice.channel) {
                await member.voice.setMute(false, t('override.audit_reason'));
              }
              
              mutedMembers.delete(mentionedUser.id);
              results.mutesRemoved = 1;
            }
          }
        }
      }

      // Override ROULETTE MUTE
      if (action === 'roulettemute' || action === 'all') {
        if (roulettemuteCommand && roulettemuteCommand.mutedMembers) {
          const mutedMembers = roulettemuteCommand.mutedMembers;
          
          if (affectAll) {
            for (const [userId, muteData] of mutedMembers) {
              try {
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (member && member.voice.channel) {
                  await member.voice.setMute(false, t('override.audit_reason'));
                }
                if (muteData.interval) clearInterval(muteData.interval);
              } catch (err) {
                console.error('Erreur démute roulette:', err);
              }
            }
            results.rouletteMutesRemoved = mutedMembers.size;
            mutedMembers.clear();
          } else if (mentionedUser) {
            if (mutedMembers.has(mentionedUser.id)) {
              const muteData = mutedMembers.get(mentionedUser.id);
              if (muteData.interval) clearInterval(muteData.interval);
              
              const member = await message.guild.members.fetch(mentionedUser.id).catch(() => null);
              if (member && member.voice.channel) {
                await member.voice.setMute(false, t('override.audit_reason'));
              }
              
              mutedMembers.delete(mentionedUser.id);
              results.rouletteMutesRemoved = 1;
            }
          }
        }
      }

      // Message de résultat
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(t('override.result_title'))
        .setDescription(
          t('override.result_target', { target: affectAll ? t('override.result_target_all') : mentionedUser.username }) + '\n' +
          t('override.result_action', { action: action.toUpperCase() }) + '\n\n' +
          '**Résultats**:\n' +
          t('override.result_label_curses', { count: results.cursesRemoved }) + '\n' +
          t('override.result_label_mutes', { count: results.mutesRemoved }) + '\n' +
          t('override.result_label_roulette', { count: results.rouletteMutesRemoved }) + '\n\n' +
          t('override.result_success')
        )
        .setTimestamp()
        .setFooter({ text: t('override.result_footer', { user: message.author.username }) });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande override:', error);
      message.reply(t('common.error'));
    }
  }
};
