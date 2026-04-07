/**
 * @file Mute Command
 * @description Mute un utilisateur dans un salon vocal pendant une durée définie avec maintien forcé du mute
 * @module commands/admin/mute
 * @category Admin
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

// Map pour stocker les membres mutés et leurs timeouts
const mutedMembers = new Map();

// Garbage collector: nettoie les entrées expirées toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, muteData] of mutedMembers) {
    if (muteData.expiresAt && now >= muteData.expiresAt) {
      if (muteData.timeout) clearTimeout(muteData.timeout);
      mutedMembers.delete(userId);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  name: 'mute',
  description: 'Mute un joueur dans le vocal pendant une durée définie (mute forcé)',
  mutedMembers,
  usage: '!mute @utilisateur <durée_en_secondes>',
  
  async execute(message, args, context) {
    const { t } = context;
    try {
      // Vérifie qu'un utilisateur est mentionné
      const mentionedUser = message.mentions.members.first();
      
      if (!mentionedUser) {
        return message.reply({
          content: t('mute.no_mention')
        });
      }

      // Vérifie que la durée est fournie
      const duration = parseInt(args[1]);
      
      if (!duration || Number.isNaN(duration) || duration < 1) {
        return message.reply({
          content: t('mute.no_duration')
        });
      }

      // Vérifie que l'utilisateur est dans un salon vocal
      if (!mentionedUser.voice.channel) {
        return message.reply(t('mute.not_in_voice', { user: mentionedUser.user.username }));
      }

      // Vérifie si le membre est déjà muté par cette commande
      if (mutedMembers.has(mentionedUser.id)) {
        const muteInfo = mutedMembers.get(mentionedUser.id);
        const timeRemaining = Math.ceil((muteInfo.endTime - Date.now()) / 1000);
        return message.reply(
          t('mute.already_muted', { user: mentionedUser.user.username }) + '\n' +
          t('mute.already_muted_desc', { time: timeRemaining })
        );
      }

      // Crée un embed pour annoncer le mute
      const embed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle(t('mute.pre_embed_title'))
        .setDescription(t('mute.pre_embed_desc', { user: mentionedUser.user.username, duration: duration }))
        .setFooter({ text: t('mute.embed_footer_requested', { user: message.author.username }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Attend 1 seconde
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mute le membre
      try {
        await mentionedUser.voice.setMute(true, t('mute.audit_reason', { user: message.author.username, duration }));
        
        const endTime = Date.now() + (duration * 1000);
        
        // Système de surveillance pour remuter automatiquement
        const checkInterval = setInterval(async () => {
          try {
            // Récupère le membre à jour
            const currentMember = await message.guild.members.fetch(mentionedUser.id);
            
            // Vérifie si le membre est toujours dans un vocal
            if (!currentMember.voice.channel) {
              return;
            }

            // Si le temps est écoulé
            if (Date.now() >= endTime) {
              await currentMember.voice.setMute(false, t('mute.unmuted_footer'));
              clearInterval(checkInterval);
              mutedMembers.delete(mentionedUser.id);
              
              const unmutedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(t('mute.unmuted_desc', { user: mentionedUser.user.username }))
                .setFooter({ text: t('mute.unmuted_footer') });
              
              await message.channel.send({ embeds: [unmutedEmbed] });
              return;
            }

            // Si le membre a enlevé son mute, on le remuter
            if (!currentMember.voice.serverMute) {
              console.log(`Remute de ${mentionedUser.user.username}`);
              await currentMember.voice.setMute(true, t('mute.remut_desc', { user: mentionedUser.user.username }));
              
              // GIFs de moquerie
              const mockingGifs = [
                'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
                'https://media.giphy.com/media/OvL3qHSMO6uaI/giphy.gif',
                'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
                'https://media.giphy.com/media/APcFiiTrG0x2/giphy.gif',
                'https://media.giphy.com/media/1jkV5ifEE5EENHESRa/giphy.gif',
                'https://media.giphy.com/media/uUIFcDYRbvJTtxaFNa/giphy.gif',
                'https://media.giphy.com/media/26n6Gx9moCgs1pUuk/giphy.gif',
                'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif'
              ];
              
              const mockingMessages = t('mute.mocking_messages');
              
              const randomGif = mockingGifs[Math.floor(Math.random() * mockingGifs.length)];
              const randomMessage = mockingMessages[Math.floor(Math.random() * mockingMessages.length)];
              
              const remutedEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription(t('mute.remut_desc', { user: mentionedUser.user.username }))
                .setImage(randomGif)
                .setFooter({ text: randomMessage });
              
              await message.channel.send({ embeds: [remutedEmbed] });
            }
          } catch (err) {
            console.error('Erreur lors de la vérification du mute:', err);
          }
        }, 1000); // Vérifie toutes les secondes

        // Stocke les informations du mute
        mutedMembers.set(mentionedUser.id, {
          interval: checkInterval,
          endTime: endTime,
          channelId: message.channel.id,
          mutedBy: message.author.id,
          expiresAt: endTime // Pour le GC
        });

        const successEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(t('mute.confirm_title'))
          .setDescription(
            t('mute.confirm_desc', { 
              user: mentionedUser.user.username, 
              duration: duration, 
              endTime: Math.floor(endTime / 1000), 
              by: message.author.username 
            })
          )
          .setFooter({ text: t('mute.confirm_footer') })
          .setTimestamp();
        
        await message.channel.send({ embeds: [successEmbed] });

      } catch (err) {
        console.error('Erreur lors du mute:', err);
        return message.reply(t('mute.permission_error'));
      }

    } catch (error) {
      console.error('Erreur dans la commande mute:', error);
      message.reply(t('common.error'));
    }
  }
};
