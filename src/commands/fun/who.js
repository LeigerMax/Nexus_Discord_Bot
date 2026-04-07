/**
 * @file Who Command
 * @description Choisit une personne aléatoire parmi les membres connectés dans le salon vocal en respectant la config
 * @module commands/fun
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');
const storageService = require('../../services/storageService');

module.exports = {
  name: 'who',
  description: 'Choisit une personne aléatoire connectée dans le salon vocal',
  usage: '!who',
  
  async execute(message, _args, context) {
    const { t } = context;
    try {
      if (!message.member.voice.channel) {
        return message.reply({
          content: t('roulette.no_voice')
        });
      }

      const voiceChannel = message.member.voice.channel;
      const members = voiceChannel.members.filter(member => !member.user.bot);
      
      if (members.size === 0) return message.reply(t('roulette.no_players'));
      if (members.size === 1) return message.reply(t('roulette.alone'));

      // --- Logique de Configuration ---
      const guildId = message.guild.id;
      let config = storageService.get(guildId) || { kings: [], loosers: [], weeklyRotation: false };

      // 1. Gérer la rotation hebdomadaire si active
      if (config.weeklyRotation) {
        const now = Date.now();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        
        if (!config.lastRotation || (now - config.lastRotation > oneWeekMs)) {
          // On change le looser aléatoirement parmi les membres du serveur
          const allGuildMembers = await message.guild.members.fetch();
          const potentialLoosers = allGuildMembers.filter(m => !m.user.bot);
          const newLooser = potentialLoosers.random();
          
          if (newLooser) {
            config.loosers = [newLooser.id];
            config.lastRotation = now;
            await storageService.set(guildId, config);
            console.log(`[Weekly Rotation] Nouveau looser pour ${message.guild.name}: ${newLooser.user.username}`);
          }
        }
      }

      // 2. Filtrer les membres selon la config
      const voiceMembersArray = Array.from(members.values());
      
      // Filtrer les Rois (ceux qui ne peuvent pas être choisis)
      let filtratedMembers = voiceMembersArray.filter(m => !config.kings.includes(m.id));
      
      // Si tout le monde est roi (cas extrême), on ignore le filtrage
      if (filtratedMembers.length === 0) filtratedMembers = voiceMembersArray;

      // 3. Vérifier s'il y a des Loosers dans le vocal
      const loosersInVocal = filtratedMembers.filter(m => config.loosers.includes(m.id));
      
      let chosenOne;
      let isForced = false;

      if (loosersInVocal.length > 0) {
        // Option : On a 80% de chance de choisir un des loosers configurés
        if (Math.random() < 0.8) {
          chosenOne = loosersInVocal[Math.floor(Math.random() * loosersInVocal.length)];
          isForced = true;
        } else {
          chosenOne = filtratedMembers[Math.floor(Math.random() * filtratedMembers.length)];
        }
      } else {
        chosenOne = filtratedMembers[Math.floor(Math.random() * filtratedMembers.length)];
      }

      // --- Réponse ---
      const embed = new EmbedBuilder()
        .setColor(isForced ? 0xFF0000 : 0x5865F2)
        .setTitle(t('who.title'))
        .setDescription(
          t('who.desc_pattern', { count: voiceMembersArray.length, user: chosenOne.user.username }) +
          (isForced ? t('who.forced_msg') : '')
        )
        .setThumbnail(chosenOne.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: t('who.footer_pattern', { count: voiceMembersArray.length }) })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande who:', error);
      message.reply(t('common.error'));
    }
  },
};
