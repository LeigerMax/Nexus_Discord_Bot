/**
 * @file RouletteMute Command
 * @description Sélectionne un joueur aléatoire du salon vocal et le mute avec maintien forcé
 * @module commands/fun/roulettemute
 * @category Fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');

// Map pour stocker les membres mutés et leurs timeouts
const mutedMembers = new Map();

// Garbage collector: nettoie les entrées expirées toutes les 5 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, muteData] of mutedMembers) {
      if (muteData.expiresAt && now >= muteData.expiresAt) {
        if (muteData.timeout) clearTimeout(muteData.timeout);
        mutedMembers.delete(userId);
      }
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  name: 'roulettemute',
  description: 'Sélectionne un joueur aléatoire du vocal et le mute pendant une durée définie (mute forcé)',
  mutedMembers,
  usage: '!roulettemute [durée_en_secondes]',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      // Vérifie que l'utilisateur est dans un salon vocal
      if (!message.member.voice.channel) {
        return message.reply({
          content: t('roulette.no_voice')
        });
      }

      const voiceChannel = message.member.voice.channel;
      
      // Récupère tous les membres du salon vocal (sauf les bots)
      const members = voiceChannel.members.filter(member => !member.user.bot);
      
      if (members.size === 0) {
        return message.reply(t('roulette.no_players'));
      }

      if (members.size === 1) {
        return message.reply(t('roulette.alone'));
      }

      // Sélectionne un membre aléatoire
      const randomMember = members.random();

      // Vérifie si le membre est déjà muté par cette commande
      if (mutedMembers.has(randomMember.id)) {
        return message.reply(t('curse.already_cursed', { user: randomMember.user.username }));
      }

      // Crée un embed pour annoncer le résultat
      const embed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle(t('roulettemute.embed_title'))
        .setDescription(t('roulettemute.embed_desc', { count: members.size, user: randomMember.user.username, by: message.author.username, duration: '...' }))
        .setFooter({ text: t('roulettemute.embed_footer') })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      // Attend 2 secondes pour le suspense
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mute le membre
      try {
        await randomMember.voice.setMute(true, t('roulettemute.audit_reason', { duration: '?' }));
        
        // Récupère la config
        const config = context.config;
        let duration = parseInt(_args[0]) || config?.rouletteMuteDuration || 300;
        
        // Vérification de la durée max configurée
        const maxDuration = config?.durationSettings?.max_duration || 3600;
        if (duration > maxDuration) {
          // On s'assure de démuter si le bot a déjà muté le joueur par erreur juste avant (bien que le check se fasse ici)
          await randomMember.voice.setMute(false, "Duration limit exceeded").catch(() => {});
          return message.reply(t('common.error_max_duration', { max: maxDuration }));
        }
        
        const endTime = Date.now() + (duration * 1000);
        
        // Système de surveillance pour remuter automatiquement
        const checkInterval = setInterval(async () => {
          try {
            // Récupère le membre à jour
            const currentMember = await message.guild.members.fetch(randomMember.id);
            
            // Vérifie si le membre est toujours dans un vocal
            if (!currentMember.voice.channel) {
              clearInterval(checkInterval);
              mutedMembers.delete(randomMember.id);
              return;
            }

            // Si le temps est écoulé
            if (Date.now() >= endTime) {
              await currentMember.voice.setMute(false, t('roulettemute.unmuted_footer'));
              clearInterval(checkInterval);
              mutedMembers.delete(randomMember.id);
              
              const unmutedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(t('roulettemute.unmuted_desc', { user: randomMember.user.username }))
                .setFooter({ text: t('roulettemute.unmuted_footer') });
              
              await message.channel.send({ embeds: [unmutedEmbed] });
              return;
            }

            // Si le membre a enlevé son mute, on le remute
            if (!currentMember.voice.serverMute) {
              await currentMember.voice.setMute(true, t('roulettemute.remut_footer'));
              
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
              
              const mockingMessages = t('roulettemute.mocking_messages');
              
              const randomGif = mockingGifs[Math.floor(Math.random() * mockingGifs.length)];
              const randomMsg = mockingMessages[Math.floor(Math.random() * mockingMessages.length)];
              
              const remutedEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription(t('roulettemute.remut_desc', { user: randomMember.user.username }))
                .setImage(randomGif)
                .setFooter({ text: randomMsg });
              
              await message.channel.send({ embeds: [remutedEmbed] });
            }
          } catch (err) {
            console.error('Erreur lors de la vérification du mute:', err);
          }
        }, 1000);

        // Stocke les informations du mute
        mutedMembers.set(randomMember.id, {
          interval: checkInterval,
          endTime: endTime,
          channelId: message.channel.id,
          expiresAt: endTime
        });

        const successEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(t('roulettemute.embed_title'))
          .setDescription(
            t('roulettemute.success_desc', { user: randomMember.user.username, duration: duration }) + `\n` +
            `👤 **${t('version.developed_by', { developer: '' }).split(' **')[0]}**: ${message.author.username}\n\n` +
            `⏱️ **${t('roulette.list_field_time')}**: ${duration} seconde(s)\n` +
            `🔓 **${t('version.recent_versions').split(' ')[1]}**: <t:${Math.floor(endTime / 1000)}:R>\n` +
            `⚠️ **${t('roulettemute.embed_footer')}**`
          )
          .setFooter({ text: t('roulettemute.remut_footer') })
          .setTimestamp();
        
        await message.channel.send({ embeds: [successEmbed] });

      } catch (err) {
        console.error('Erreur lors du mute:', err);
        return message.reply(t('roulettehard.permission_error'));
      }

    } catch (error) {
      console.error('Erreur dans la commande roulettemute:', error);
      message.reply(t('common.error'));
    }
  }
};
