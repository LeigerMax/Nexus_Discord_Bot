/**
 * @file Voice State Update Event
 * @description Surveille les changements de salon vocal d'un utilisateur spécifique et annonce ses entrées/sorties
 * @module events/voiceStateUpdate
 * @listens voiceStateUpdate
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');
const LOOSER_ID = process.env.LOOSER_ID;
const KING_ID = process.env.KING_ID;
const ACTIVITY_SALON_ID = process.env.ACTIVITY_SALON_ID;

const auditService = require('../services/auditService');
const storageService = require('../services/storageService');
 
module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // Log Audit (v1.0.0)
      await auditService.logVoice(oldState, newState);

      // Gestion des Salons Vocaux Temporaires (v1.1.0)
      await handleTempChannels(oldState, newState);

      const config = storageService.get(newState.guild.id);

      let activityChannelId = ACTIVITY_SALON_ID;
      // Optionnel : l'utilisateur peut avoir configuré la surveillance dans une channel via dashboard
      if (config && config.monitoring && config.monitoring.enabled && config.monitoring.channelId) {
        activityChannelId = config.monitoring.channelId;
      }
      
      const channel = newState.guild.channels.cache.get(activityChannelId);
      if (!channel) return;

      const loosers = config?.loosers?.length > 0 ? config.loosers : (LOOSER_ID ? [LOOSER_ID] : []);
      const kings = config?.kings?.length > 0 ? config.kings : (KING_ID ? [KING_ID] : []);

      // Vérifie l'user
      if (loosers.includes(newState.member.id)) {

        // Vérifie s'il vient de rejoindre un vocal 
        if (!oldState.channel && newState.channel) {
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`🤡 Un Looser a rejoint le vocal!`)
            .setDescription(
              `🔊 **${newState.member.user.username}** vient de rejoindre **${newState.channel.name}**!\n\n` +
              `✨ *Le nul est arrivé!*`
            )
            .setThumbnail(newState.member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExY284NmNxZXBhd3c2Y3I5MDVtdnU0aXk1MzNvenNuNnQ4eHFtc3liZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vp851KKczV9Li/giphy.gif')
            .setFooter({ text: 'Riez de sa nullité' })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }

        // Vérifie s'il vient de quitter un vocal
        if (oldState.channel && !newState.channel) {
          const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle(`👋 Un Looser a quitté le vocal`)
            .setDescription(`🔇 **${newState.member.user.username}** a quitté le vocal\n\n*Le nul s'en va...*`)
            .setImage('https://media.tenor.com/NDJLISUesWcAAAAM/scream-loud-scream.gif')
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }

      }
      else if (kings.includes(newState.member.id)) {
        // Vérifie s'il vient de rejoindre un vocal 
        if (!oldState.channel && newState.channel) {
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`👑 Le Roi est arrivé!`)
            .setDescription(
              `🔊 **${newState.member.user.username}** vient de rejoindre **${newState.channel.name}**!\n\n` +
              `✨ *Le Roi nous honore de sa présence!*`)
            .setThumbnail(newState.member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXJrNmdrZHd1aW45bnB6MmtxZzNicmZveWg0ZGFyNnFuNWxrMTZ1MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/F0uvYzyr2a7Li/giphy.gif')
            .setFooter({ text: 'All hail the King! 👑' })
            .setTimestamp();  

            await channel.send({ embeds: [embed] });
        }

        // Vérifie s'il vient de quitter un vocal
        if (oldState.channel && !newState.channel) {
          const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('👋 Le Roi s\'est déconnecté')
            .setDescription(
              `🚪 **${newState.member.user.username}** vient de quitter le vocal\n\n` +
              `*Le Roi nous a quittés...*`)
            .setThumbnail(newState.member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGJvb2FtejY1dHo4YjcwcGlmbWU4emExZWZoZ2w3cHF4ZGtzN205cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/D80G19w5FoPuesfoMT/giphy.gif')
            .setFooter({ text: 'Absence du Roi' })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      }

    } catch (error) {
      console.error('Erreur dans l\'event voiceStateUpdate:', error);
    }
  });
};

/**
 * Gère la création et la suppression des salons temporaires
 */
async function handleTempChannels(oldState, newState) {
  const { ChannelType } = require('discord.js');
  const tempStorageConfig = storageService.get(newState.guild.id);

  if (!tempStorageConfig || !tempStorageConfig.tempChannels || !tempStorageConfig.tempChannels.enabled) return;

  const { hubChannelId, categoryId } = tempStorageConfig.tempChannels;

  // 1. Création d'un salon quand on rejoint le Hub
  if (newState.channelId === hubChannelId) {
    try {
      const member = newState.member;
      const tempChannel = await newState.guild.channels.create({
        name: `🎙️ Vocal de ${member.displayName}`,
        type: ChannelType.GuildVoice,
        parent: categoryId || newState.channel.parent,
        permissionOverwrites: [
          {
            id: member.id,
            allow: ['ManageChannels', 'MoveMembers', 'MuteMembers', 'DeafenMembers']
          }
        ]
      });

      // On déplace le membre
      await member.voice.setChannel(tempChannel);
    } catch (err) {
      console.error('[TEMPCHANNELS] Erreur création:', err.message);
    }
  }

  // 2. Suppression d'un salon temporaire quand il est vide
  if (oldState.channel && oldState.channel.id !== hubChannelId) {
    if (oldState.channel.name.startsWith('🎙️ Vocal de') && oldState.channel.members.size === 0) {
      try {
        await oldState.channel.delete();
      } catch {
        // Le salon a peut-être déjà été supprimé ou erreur de permission
      }
    }
  }
}
