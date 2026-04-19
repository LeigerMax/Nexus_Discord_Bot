/**
 * @file Curse Command
 * @description Lance une malédiction aléatoire sur un joueur avec divers effets (altération messages, mute vocal, etc.)
 * @module commands/fun/curse
 * @category Fun
 * @requires discord.js
 */
const { EmbedBuilder } = require('discord.js');
const storageService = require('../../services/storageService');

// Map pour stocker les joueurs maudits
const cursedPlayers = new Map();

// Garbage collector: nettoie les entrées expirées toutes les 5 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, curseData] of cursedPlayers) {
      if (curseData.expiresAt && now >= curseData.expiresAt) {
        clearInterval(curseData.interval);
        cursedPlayers.delete(userId);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Types de malédictions disponibles (Données statiques pour la logique)
const CURSES = {
  RANDOM_RESPONSES: { emoji: '🎲', color: 0xFF00FF },
  IGNORED: { emoji: '👻', color: 0x808080 },
  BLOCKED: { emoji: '🚫', color: 0xFF0000 },
  WORST_LUCK: { emoji: '💀', color: 0x000000 },
  PUBLIC_SHAME: { emoji: '📢', color: 0xFFA500 },
  GARBLED: { emoji: '🔀', color: 0x00FFFF },
  VOICE_MUTE: { emoji: '🔇', color: 0xFF6600 },
  SPAM: { emoji: '💥', color: 0xFF1493 },
  REVERSED: { emoji: '🔄', color: 0x9400D3 },
  SLOW_MODE: { emoji: '🐌', color: 0x32CD32 },
  MESSAGE_SCRAMBLER: { emoji: '🔀', color: 0x8A2BE2 },
  MESSAGE_OPPOSER: { emoji: '🔄', color: 0xFF4500 },
  CLOWN_MODE: { emoji: '🤡', color: 0xFF69B4 },
  UWU_MODE: { emoji: '😺', color: 0xFFB6C1 },
  YODA_MODE: { emoji: '🗣️', color: 0x2E8B57 },
  CAPS_LOCK: { emoji: '📢', color: 0xDC143C },
  PIRATE_MODE: { emoji: '🏴‍☠️', color: 0x8B4513 },
  VOWEL_REMOVER: { emoji: '🎯', color: 0x4169E1 },
  REVERSE_TEXT: { emoji: '🔁', color: 0x6A5ACD },
  RANDOM_EMOJI: { emoji: '🌈', color: 0xFF1493 },
  CHALLENGE: { emoji: '🧩', color: 0xFFA500 },
  POLITE_MODE: { emoji: '🤵', color: 0xFFD700 },
  SHY_MODE: { emoji: '😳', color: 0xFFB6C1 },
  EMOJI_ONLY: { emoji: '😜', color: 0xFFFF00 },
  QUESTIONER: { emoji: '❓', color: 0x4682B4 },
  SELF_DESTRUCT: { emoji: '🧨', color: 0xFF4500 },
  PARROT: { emoji: '🦜', color: 0x00FF7F }
};

module.exports = {
  name: 'curse',
  description: 'Lance une malédiction sur un joueur',
  usage: '!curse [@joueur] [durée] [TYPE] OU !curse hidden [@joueur] [durée] [TYPE] OU !curse types',
  cursedPlayers,

  async execute(message, args, context) {
    const { t } = context;
    try {
      // Mode caché : !curse hidden @joueur durée TYPE_MALEDICTION
      let hiddenMode = false;
      let selectedCurseType = null;

      if (args[0] === 'hidden') {
        hiddenMode = true;
        args.shift(); // Retire "hidden" des arguments

        // Efface le message de commande immédiatement
        await message.delete().catch(() => { });

        // Le dernier argument est le type de malédiction
        const curseTypeArg = args[args.length - 1];
        if (curseTypeArg && CURSES[curseTypeArg.toUpperCase()]) {
          selectedCurseType = curseTypeArg.toUpperCase();
          args.pop(); // Retire le type de malédiction des arguments
        } else {
          // Si pas de type valide, envoie un message privé avec les options
          const curseList = Object.keys(CURSES).map(key =>
            `\`${key}\` - ${CURSES[key].emoji} ${t(`curse.types.${key}.name`)}`
          ).join('\n');

          try {
            await message.author.send(
              t('curse.invalid_type') + '\n\n' +
              t('curse.help_syntax') + '\n\n' +
              t('curse.available_types') + '\n' + curseList
            );
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
      }

      // Commande pour afficher les types de malédictions (caché)
      if (args[0] === 'types') {
        await message.delete().catch(() => { });

        const curseList = Object.keys(CURSES).map(key =>
          `\`${key}\` - ${CURSES[key].emoji} ${t(`curse.types.${key}.name`)}\n${t(`curse.types.${key}.desc`)}`
        ).join('\n\n');

        try {
          const embed = new EmbedBuilder()
            .setColor(0x9400D3)
            .setTitle(t('curse.types_title'))
            .setDescription(
              t('curse.hidden_syntax') + '\n\n' +
              t('curse.hidden_example') + '\n\n' +
              t('curse.available_types') + '\n\n' + curseList
            )
            .setFooter({ text: t('curse.hidden_footer') })
            .setTimestamp();

          await message.author.send({ embeds: [embed] });
        } catch (err) {
          console.error('Impossible d\'envoyer un MP:', err);
        }
        return;
      }

      // Commande pour lever toutes les malédictions (admin only)
      if (args[0] === 'clear') {
        if (!message.member.permissions.has('Administrator')) {
          return message.reply(t('curse.no_admin_clear'));
        }
        cursedPlayers.clear();
        return message.reply(t('curse.cleared_all', { user: message.author.username }));
      }

      // Commande pour voir les joueurs maudits
      if (args[0] === 'list') {
        if (cursedPlayers.size === 0) {
          return message.reply(t('curse.list_empty'));
        }

        const listEmbed = new EmbedBuilder()
          .setColor(0x9400D3)
          .setTitle(t('curse.list_title'))
          .setDescription(t('curse.list_desc'))
          .setTimestamp();

        for (const [userId, curseData] of cursedPlayers) {
          const user = await message.guild.members.fetch(userId).catch(() => null);
          if (user) {
            const timeLeft = Math.ceil((curseData.endTime - Date.now()) / 1000);
            const curse = CURSES[curseData.type];
            listEmbed.addFields({
              name: `${curse.emoji} ${user.user.username}`,
              value: `${t('curse.list_field_curse')}: ${t(`curse.types.${curseData.type}.name`)}\n${t('curse.list_field_time')}: ${timeLeft} seconde(s)`,
              inline: true
            });
          }
        }

        return message.reply({ embeds: [listEmbed] });
      }

      let targetMember;
      let duration = 300; // Durée par défaut : 300 secondes (5 minutes)

      // Mode aléatoire : choisit un joueur en vocal
      if (args[0] === 'random') {
        const voiceChannels = message.guild.channels.cache.filter(
          channel => channel.type === 2 && channel.members.size > 0 // Type 2 = GuildVoice
        );

        const allVoiceMembers = [];
        voiceChannels.forEach(channel => {
          channel.members.forEach(member => {
            if (!member.user.bot && member.id !== message.author.id) {
              allVoiceMembers.push(member);
            }
          });
        });

        if (allVoiceMembers.length === 0) {
          return message.reply(t('curse.no_voice_random'));
        }

        targetMember = allVoiceMembers[Math.floor(Math.random() * allVoiceMembers.length)];

        if (args[1]) {
          const potDuration = parseInt(args[1]);
          if (!isNaN(potDuration)) {
            // Vérification de la durée max configurée
            const maxDuration = context.config?.durationSettings?.max_duration || 3600;
            if (potDuration > maxDuration) {
              if (hiddenMode) {
                try {
                  await message.author.send(t('common.error_max_duration', { max: maxDuration }));
                } catch (err) {
                  console.error('Impossible d\'envoyer un MP:', err);
                }
                return;
              }
              return message.reply(t('common.error_max_duration', { max: maxDuration }));
            }
            duration = potDuration;
            if (args[2] && CURSES[args[2].toUpperCase()]) {
              selectedCurseType = args[2].toUpperCase();
            }
          } else if (CURSES[args[1].toUpperCase()]) {
            selectedCurseType = args[1].toUpperCase();
          }
        }
      } else {
        // Mode ciblé : mentionne un joueur
        targetMember = message.mentions.members.first();

        if (!targetMember) {
          return message.reply({
            content: t('curse.mention_error') + '\n' + t('curse.examples')
          });
        }

        if (args[1]) {
          const potDuration = parseInt(args[1]);
          if (!isNaN(potDuration)) {
            // Vérification de la durée max configurée
            const maxDuration = context.config?.durationSettings?.max_duration || 3600;
            if (potDuration > maxDuration) {
              if (hiddenMode) {
                try {
                  await message.author.send(t('common.error_max_duration', { max: maxDuration }));
                } catch (err) {
                  console.error('Impossible d\'envoyer un MP:', err);
                }
                return;
              }
              return message.reply(t('common.error_max_duration', { max: maxDuration }));
            }
            duration = potDuration;
            if (args[2] && CURSES[args[2].toUpperCase()]) {
              selectedCurseType = args[2].toUpperCase();
            }
          } else if (CURSES[args[1].toUpperCase()]) {
            selectedCurseType = args[1].toUpperCase();
          }
        }
      }

      // Validation de la durée
      if (isNaN(duration) || duration < 1) {
        if (hiddenMode) {
          try {
            await message.author.send(t('curse.duration_error'));
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
        return message.reply(t('curse.duration_error'));
      }

      // Empêche de maudire un bot
      if (targetMember.user.bot) {
        if (hiddenMode) {
          try {
            await message.author.send(t('curse.bot_error'));
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
        return message.reply(t('curse.bot_error'));
      }

      // Vérifie si le joueur est déjà maudit
      if (cursedPlayers.has(targetMember.id)) {
        const curseData = cursedPlayers.get(targetMember.id);
        const timeLeft = Math.ceil((curseData.endTime - Date.now()) / 1000);

        if (hiddenMode) {
          try {
            await message.author.send(
              t('curse.already_cursed', { user: targetMember.user.username }) + '\n' +
              t('curse.already_cursed_time', { time: timeLeft })
            );
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }

        return message.reply(
          t('curse.already_cursed', { user: targetMember.user.username }) + '\n' +
          t('curse.already_cursed_time', { time: timeLeft })
        );
      }

      // Vérification des malédictions désactivées sur le serveur
      const config = storageService.get(message.guild.id);
      const disabledCurses = config?.curseSettings?.disabledTypes || [];

      // Choisit une malédiction aléatoire ou utilise celle spécifiée
      let randomCurseType;
      if (selectedCurseType) {
        if (disabledCurses.includes(selectedCurseType)) {
          return message.reply(t('curse.disabled_error', { type: selectedCurseType }));
        }
        randomCurseType = selectedCurseType;
      } else {
        const curseTypes = Object.keys(CURSES).filter(type => !disabledCurses.includes(type));
        if (curseTypes.length === 0) {
          return message.reply(t('curse.all_disabled_error'));
        }
        randomCurseType = curseTypes[Math.floor(Math.random() * curseTypes.length)];
      }
      const selectedCurse = CURSES[randomCurseType];

      const endTime = Date.now() + (duration * 1000);

      // Annonce dramatique (sauf en mode caché)
      if (!hiddenMode) {
        const announceEmbed = new EmbedBuilder()
          .setColor(0x9400D3)
          .setTitle(t('curse.summon_title'))
          .setDescription(
            `${t('curse.summon_desc')}\n\n` +
            `${t('curse.summon_target', { user: targetMember.user.username })}\n` +
            `${t('curse.summon_duration', { duration: duration })}\n\n` +
            t('curse.summon_incanting')
          )
          .setThumbnail('https://media.tenor.com/oqKD0X5sQ58AAAAM/dark-magic.gif')
          .setFooter({ text: t('curse.summon_footer', { user: message.author.username }) })
          .setTimestamp();

        await message.reply({ embeds: [announceEmbed] });

        // Attend 2 secondes pour le suspense
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Applique la malédiction spécifique
      let extraEffect = '';
      let challengePhrase = null;
      let trapPhrase = null;
      let startTime = Date.now();

      if (randomCurseType === 'CHALLENGE') {
        const challengePhrases = t('curse.challenge_phrases');
        challengePhrase = challengePhrases[Math.floor(Math.random() * challengePhrases.length)];
        // Injection de caractères invisibles (\u200B) pour bloquer le copier-coller simple
        trapPhrase = challengePhrase.split('').map(char =>
          Math.random() < 0.2 ? char + '\u200B' : char
        ).join('');
        extraEffect = `\n${t('curse.challenge_label')}:\n\`${trapPhrase}\`\n\n${t('curse.challenge_instr')}`;
      }

      if ((randomCurseType === 'VOICE_MUTE' || randomCurseType === 'CHALLENGE') && targetMember.voice.channel) {
        try {
          await targetMember.voice.setMute(true, t('curse.audit_reason', { duration }));
          extraEffect += `\n🔇 **${t('curse.audit_force_mute')}**`;
        } catch (err) {
          console.error('Impossible de mute:', err);
        }
      }

      // Stocke la malédiction
      const curseInterval = setInterval(async () => {
        const curseData = cursedPlayers.get(targetMember.id);
        if (!curseData) {
          clearInterval(curseInterval);
          return;
        }

        // Effet de honte publique
        if (randomCurseType === 'PUBLIC_SHAME' && Date.now() < endTime) {
          const shameMessages = t('curse.shame_messages');

          if (Math.random() < 0.3) {
            const randomMsg = shameMessages[Math.floor(Math.random() * shameMessages.length)];
            message.channel.send(randomMsg.replace('{user}', targetMember.toString())).catch(() => { });
          }
        }

        // Effet de spam
        if (randomCurseType === 'SPAM' && Date.now() < endTime) {
          if (Math.random() < 0.2) {
            const spamMessages = t('curse.spam_messages');
            const randomMsg = spamMessages[Math.floor(Math.random() * spamMessages.length)];
            message.channel.send(randomMsg.replace('{user}', targetMember.toString())).catch(() => { });
          }
        }

        // Mute forcé pour VOICE_MUTE et CHALLENGE
        if ((randomCurseType === 'VOICE_MUTE' || randomCurseType === 'CHALLENGE') && Date.now() < endTime) {
          try {
            const currentMember = await message.guild.members.fetch(targetMember.id);
            if (currentMember.voice.channel && !currentMember.voice.serverMute) {
              await currentMember.voice.setMute(true, t('curse.audit_force_mute'));
            }
          } catch {
            // Ignore les erreurs de mute
          }
        }

      }, 2000); // Vérifie toutes les 2 secondes

      cursedPlayers.set(targetMember.id, {
        type: randomCurseType,
        endTime: endTime,
        interval: curseInterval,
        cursedBy: message.author.id,
        channelId: message.channel.id,
        challengePhrase: challengePhrase,
        trapPhrase: trapPhrase,
        startTime: startTime,
        expiresAt: endTime // Timestamp d'expiration pour le GC
      });

      // Annonce de la malédiction
      if (!hiddenMode) {
        const curseEmbed = new EmbedBuilder()
          .setColor(selectedCurse.color)
          .setTitle(t('curse.confirm_title', { emoji: selectedCurse.emoji }))
          .setDescription(
            `${t('curse.confirm_desc', { user: targetMember.user.username })}\n\n` +
            `${t('curse.confirm_curse', { name: t(`curse.types.${randomCurseType}.name`) })}\n` +
            `${t('curse.confirm_effect', { desc: t(`curse.types.${randomCurseType}.desc`) })}\n` +
            `${t('curse.confirm_duration', { duration: duration })}\n` +
            `${t('curse.confirm_end', { time: Math.floor(endTime / 1000) })}${extraEffect}\n\n` +
            t('curse.confirm_closing')
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media.tenor.com/Y3bzC_SEtfMAAAAM/evil-laugh-laughing.gif')
          .setFooter({ text: t('curse.confirm_footer', { user: message.author.username }) })
          .setTimestamp();

        await message.channel.send({ embeds: [curseEmbed] });
      } else {
        // En mode caché, envoie juste une confirmation en MP
        try {
          const confirmEmbed = new EmbedBuilder()
            .setColor(selectedCurse.color)
            .setTitle(t('curse.hidden_confirm_title', { emoji: selectedCurse.emoji }))
            .setDescription(
              `${t('curse.hidden_confirm_desc', { user: targetMember.user.username })}\n\n` +
              `${t('curse.confirm_curse', { name: t(`curse.types.${randomCurseType}.name`) })}\n` +
              `${t('curse.confirm_effect', { desc: t(`curse.types.${randomCurseType}.desc`) })}\n` +
              `${t('curse.confirm_duration', { duration: duration })}\n` +
              `${t('curse.confirm_end', { time: Math.floor(endTime / 1000) })}${extraEffect}\n\n` +
              t('curse.hidden_confirm_closing')
            )
            .setFooter({ text: t('curse.hidden_confirm_footer') })
            .setTimestamp();

          await message.author.send({ embeds: [confirmEmbed] });
        } catch (err) {
          console.error('Impossible d\'envoyer le MP de confirmation:', err);
        }
      }

      // Timer pour lever la malédiction
      setTimeout(async () => {
        const curseData = cursedPlayers.get(targetMember.id);
        if (!curseData) return;

        clearInterval(curseData.interval);
        cursedPlayers.delete(targetMember.id);

        // Démute si c'était un voice mute
        if (randomCurseType === 'VOICE_MUTE') {
          const member = await message.guild.members.fetch(targetMember.id).catch(() => null);
          if (member && member.voice.channel) {
            await member.voice.setMute(false, t('curse.lifted_footer')).catch(() => { });
          }
        }

        const liftEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(t('curse.lifted_title'))
          .setDescription(
            `${t('curse.lifted_desc', { user: targetMember.user.username, name: t(`curse.types.${randomCurseType}.name`) })}\n\n` +
            `${t('curse.lifted_label_by')}: ${message.author.username}`
          )
          .setFooter({ text: t('curse.lifted_footer') })
          .setTimestamp();

        message.channel.send({ embeds: [liftEmbed] });
      }, duration * 1000);

    } catch (error) {
      console.error('Erreur dans la commande curse:', error);
      message.reply(t('common.error'));
    }
  },

  // Fonction utilitaire pour vérifier si un joueur est maudit
  isCursed(userId) {
    return cursedPlayers.has(userId);
  },

  // Fonction pour obtenir le type de malédiction
  getCurseType(userId) {
    const curseData = cursedPlayers.get(userId);
    return curseData ? curseData.type : null;
  },

  // Fonction pour obtenir une réponse aléatoire absurde
  getRandomResponse(t) {
    const responses = t ? t('curse.random_responses') : [
        'Désolé, je suis occupé à compter les pixels.',
        'La réponse est 42... ou peut-être pas.',
        '🦆 Coin coin !'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },

  // Exporte les types de malédictions pour le commandHandler
  CURSES
};
