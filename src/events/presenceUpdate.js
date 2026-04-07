/**
 * @file Presence Update Event
 * @description Surveille les changements de présence de plusieurs utilisateurs et annonce leurs connexions/déconnexions
 * @module events/presenceUpdate
 * @listens presenceUpdate
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');
const storageService = require('../services/storageService');

module.exports = (client) => {
  client.on('presenceUpdate', async (oldPresence, newPresence) => {
    try {
      if (!newPresence.guild) return;

      const guildId = newPresence.guild.id;
      const config = storageService.get(guildId);
      
      let targetIds = [];
      let channelId = process.env.ACTIVITY_SALON_ID;

      // 1. Priorité au Dashboard (Loosers & Surveillance)
      if (config) {
        if (config.loosers) {
            targetIds.push(...config.loosers);
        }
        if (config.monitoring?.enabled) {
            if (config.monitoring.targetIds) targetIds.push(...config.monitoring.targetIds);
            if (config.monitoring.channelId) channelId = config.monitoring.channelId;
        }
      }
      
      // 2. Fallback .env pour compatibilité
      if (process.env.LOOSER_ID && !targetIds.includes(process.env.LOOSER_ID)) {
        targetIds.push(process.env.LOOSER_ID);
      }

      if (targetIds.length === 0 || !channelId) return;

      const channel = newPresence.guild.channels.cache.get(channelId);
      if (!channel) return;

      // Vérifie si l'utilisateur est dans la liste des cibles
      if (!targetIds.includes(newPresence.userId)) return;

      const oldStatus = oldPresence?.status || 'offline';
      const newStatus = newPresence.status;

      // Évite les déclenchements si le statut n'a pas réellement changé
      if (oldStatus === newStatus) return;

      const guild = newPresence.guild;
      const member = await guild.members.fetch(newPresence.userId).catch(() => null);
      if (!member) return;

      // --- Détection des changements de statut ---

      // En ligne !
      if (oldStatus === 'offline' && (newStatus === 'online' || newStatus === 'idle' || newStatus === 'dnd')) {
        const embed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('👑 Le Nul est en ligne!')
          .setDescription(`✨ **${member.user.username}** vient de se connecter sur Discord!\n\n*Le nul nous fait l'honneur de sa présence*`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://c.tenor.com/iu4JYPYUSmoAAAAd/tenor.gif')
          .setFooter({ text: 'All hail the noob! 👑' })
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      // Hors ligne...
      else if (oldStatus !== 'offline' && newStatus === 'offline') {
        const embed = new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`👋 ${member.user.username} s'est déconnecté`)
          .setDescription(`Door **${member.user.username}** vient de se déconnecter de Discord\n\n*Le nul a fui...*`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media.tenor.com/pjxZ7r5UUWsAAAAM/abell46s-reface.gif')
          .setFooter({ text: 'Absence du nul' })
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      // Ne pas déranger
      else if (oldStatus !== 'dnd' && newStatus === 'dnd') {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`🚫 ${member.user.username} ne veut pas être dérangé`)
          .setDescription(`😡 **${member.user.username}** s'est mis en "Ne pas déranger"\n\n*Le nul est en colère...*`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyY3JlaHB1OXNnMmRyd2x5OXZnNTZwMWFvOW9kOGFxOHdpZXRyb2tjeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/EtB1yylKGGAUg/giphy.gif')
          .setFooter({ text: 'Le nul est énervé 😠' })
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      // Inactif
      else if (oldStatus !== 'idle' && newStatus === 'idle') {
        const embed = new EmbedBuilder()
          .setColor(0xFFFF00)
          .setTitle(`💤 ${member.user.username} est maintenant inactif`)
          .setDescription(`😴 **${member.user.username}** s'est mis en "Inactif"\n\n*Le nul est parti chier dans un coin de sa maison...*`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGQwNjBqYXpyc3ZpbjhwcWgxNDFrcW5ycHl5bDVwdnQwZ3VpMmpvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wds8J0sb4fnKo/giphy.gif')
          .setFooter({ text: 'Le nul se vide' })
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur dans presenceUpdate :', error);
    }
  });
};
