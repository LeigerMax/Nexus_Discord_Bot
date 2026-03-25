/**
 * @file Curse Command
 * @description Lance une malédiction aléatoire sur un joueur avec divers effets (altération messages, mute vocal, etc.)
 * @module commands/fun/curse
 * @category Fun
 * @requires discord.js
 */
const { EmbedBuilder } = require('discord.js');

// Map pour stocker les joueurs maudits
const cursedPlayers = new Map();

// Garbage collector: nettoie les entrées expirées toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, curseData] of cursedPlayers) {
    if (curseData.expiresAt && now >= curseData.expiresAt) {
      clearInterval(curseData.interval);
      cursedPlayers.delete(userId);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

// Phrases complexes pour la malédiction CHALLENGE
const CHALLENGE_PHRASES = [
  "Le chasseur sachant chasser chasse sans son chien dans les bois sombres.",
  "Si six scies scient six cyprès, six cent six scies scient six cent six cyprès.",
  "Un chasseur sachant chasser doit savoir chasser sans son chien de chasse.",
  "Trois tortues trottaient sur un trottoir très étroit.",
  "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?",
  "Un pâtissier qui pâtissait chez un tapissier qui tapissait, dit au tapissier qui tapissait : pourquoi tapisses-tu chez un pâtissier qui pâtisse ?",
  "Fruits frais, fruits frits, fruits cuits, fruits crus.",
  "La robe rouge de Rosalie est ravissante.",
  "Douze douches douces.",
  "Pruneau cuit, pruneau cru, pruneau cuit, pruneau cru."
];

// Types de malédictions disponibles
const CURSES = {
  RANDOM_RESPONSES: {
    name: '🎲 Réponses Aléatoires',
    description: 'Toutes les commandes renvoient des réponses absurdes',
    emoji: '🎲',
    color: 0xFF00FF
  },
  IGNORED: {
    name: '👻 Ignoré',
    description: 'Le bot ignore complètement tous les messages',
    emoji: '👻',
    color: 0x808080
  },
  BLOCKED: {
    name: '🚫 Bloqué',
    description: 'Aucune commande ne fonctionne',
    emoji: '🚫',
    color: 0xFF0000
  },
  WORST_LUCK: {
    name: '💀 Malchance',
    description: 'Tous les résultats aléatoires sont les pires possibles',
    emoji: '💀',
    color: 0x000000
  },
  PUBLIC_SHAME: {
    name: '📢 Honte Publique',
    description: 'Le bot rappelle constamment que tu es maudit',
    emoji: '📢',
    color: 0xFFA500
  },
  GARBLED: {
    name: '🔀 Messages Déformés',
    description: 'Tous les messages sont inversés ou mélangés',
    emoji: '🔀',
    color: 0x00FFFF
  },
  VOICE_MUTE: {
    name: '🔇 Mute Vocal',
    description: 'Muté dans tous les salons vocaux',
    emoji: '🔇',
    color: 0xFF6600
  },
  SPAM: {
    name: '💥 Spam de Mentions',
    description: 'Le bot te mentionne aléatoirement',
    emoji: '💥',
    color: 0xFF1493
  },
  REVERSED: {
    name: '🔄 Commandes Inversées',
    description: 'Les commandes se retournent contre toi (spam, curse, etc.)',
    emoji: '🔄',
    color: 0x9400D3
  },
  SLOW_MODE: {
    name: '🐌 Mode Lent',
    description: 'Le bot répond avec 10 secondes de délai',
    emoji: '🐌',
    color: 0x32CD32
  },
  MESSAGE_SCRAMBLER: {
    name: '🔀 Mélangeur de Mots',
    description: 'Tes messages sont réécrits avec les mots mélangés',
    emoji: '🔀',
    color: 0x8A2BE2
  },
  MESSAGE_OPPOSER: {
    name: '🔄 Opposé',
    description: 'Tes messages disent l\'inverse de ce que tu veux',
    emoji: '🔄',
    color: 0xFF4500
  },
  CLOWN_MODE: {
    name: '🤡 Mode Clown',
    description: 'Des emojis clown envahissent tous tes messages',
    emoji: '🤡',
    color: 0xFF69B4
  },
  UWU_MODE: {
    name: '😺 Mode UwU',
    description: 'Tes messages sont transformés en langage UwU',
    emoji: '😺',
    color: 0xFFB6C1
  },
  YODA_MODE: {
    name: '🗣️ Mode Yoda',
    description: 'Comme Yoda parler tu dois',
    emoji: '🗣️',
    color: 0x2E8B57
  },
  CAPS_LOCK: {
    name: '📢 CAPS LOCK',
    description: 'TOUS TES MESSAGES SONT EN MAJUSCULES!!!!',
    emoji: '📢',
    color: 0xDC143C
  },
  PIRATE_MODE: {
    name: '🏴‍☠️ Mode Pirate',
    description: 'Comme un pirate parler tu vas, moussaillon!',
    emoji: '🏴‍☠️',
    color: 0x8B4513
  },
  VOWEL_REMOVER: {
    name: '🎯 Suppression Voyelles',
    description: 'Ttes ls vyls dsprsssnt d ts mssg',
    emoji: '🎯',
    color: 0x4169E1
  },
  REVERSE_TEXT: {
    name: '🔁 Texte Inversé',
    description: 'sruobne à l\'tircé tse txet noT',
    emoji: '🔁',
    color: 0x6A5ACD
  },
  RANDOM_EMOJI: {
    name: '🌈 Emojis Aléatoires',
    description: 'Des mots sont remplacés par des emojis bizarres',
    emoji: '🌈',
    color: 0xFF1493
  },
  CHALLENGE: {
    name: '🧩 Épreuve du Scribe',
    description: 'Recopie la phrase complexe pour lever le sort (Mute Vocal/Chat)',
    emoji: '🧩',
    color: 0xFFA500
  },
  POLITE_MODE: {
    name: '🤵 Mode Majordome',
    description: 'Oblige à être poli (Monsieur, ... salutations distinguées)',
    emoji: '🤵',
    color: 0xFFD700
  },
  SHY_MODE: {
    name: '😳 Mode Timide',
    description: 'Messages limités à 10 caractères et tronqués',
    emoji: '😳',
    color: 0xFFB6C1
  },
  EMOJI_ONLY: {
    name: '😜 Mode Émoticône',
    description: 'Uniquement des emojis autorisés',
    emoji: '😜',
    color: 0xFFFF00
  },
  QUESTIONER: {
    name: '❓ Point d\'Interrogation',
    description: 'Tous les messages doivent finir par un point d\'interrogation',
    emoji: '❓',
    color: 0x4682B4
  },
  SELF_DESTRUCT: {
    name: '🧨 Auto-Destruction',
    description: 'Les messages se suppriment après 5 secondes',
    emoji: '🧨',
    color: 0xFF4500
  },
  PARROT: {
    name: '🦜 Le Perroquet',
    description: 'Le bot répète tes messages de façon moqueuse',
    emoji: '🦜',
    color: 0x00FF7F
  }
};

// Réponses aléatoires absurdes pour la malédiction RANDOM_RESPONSES
const RANDOM_RESPONSES = [
  'Désolé, je suis occupé à compter les pixels.',
  'La réponse est 42... ou peut-être pas.',
  '🦆 Coin coin !',
  'Erreur 404 : Cerveau non trouvé.',
  'As-tu essayé de l\'éteindre et de le rallumer ?',
  'Je suis une théière. ☕',
  'BEEP BOOP Je suis un robot 🤖',
  'Demande à Miguel... ah non attends.',
  'La réponse est dans ton cœur... ou pas.',
  '*Le bot est parti chercher des cigarettes*',
  'Je refuse de répondre sans mon avocat.',
  'Tape /help pour... ah non ça marche pas pour toi.'
];

module.exports = {
  name: 'curse',
  description: 'Lance une malédiction sur un joueur',
  usage: '!curse [@joueur] [durée] [TYPE] OU !curse hidden [@joueur] [durée] [TYPE] OU !curse types',
  cursedPlayers,

  async execute(message, args) {
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
            `\`${key}\` - ${CURSES[key].emoji} ${CURSES[key].name}`
          ).join('\n');

          try {
            await message.author.send(
              `❌ **Type de malédiction invalide!**\n\n` +
              `**Syntaxe**: \`!curse hidden @joueur durée TYPE\`\n\n` +
              `**Types disponibles**:\n${curseList}`
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
          `\`${key}\` - ${CURSES[key].emoji} ${CURSES[key].name}\n${CURSES[key].description}`
        ).join('\n\n');

        try {
          const embed = new EmbedBuilder()
            .setColor(0x9400D3)
            .setTitle('👹 Types de Malédictions')
            .setDescription(
              `**Syntaxe cachée**: \`!curse hidden @joueur durée TYPE\`\n\n` +
              `**Exemple**: \`!curse hidden @joueur 10 UWU_MODE\`\n\n` +
              `**Types disponibles**:\n\n${curseList}`
            )
            .setFooter({ text: 'Message envoyé en privé pour rester caché' })
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
          return message.reply('❌ Seul un administrateur peut lever les malédictions!');
        }
        cursedPlayers.clear();
        return message.reply(`✨ Toutes les malédictions ont été levées par **${message.author.username}**!`);
      }

      // Commande pour voir les joueurs maudits
      if (args[0] === 'list') {
        if (cursedPlayers.size === 0) {
          return message.reply('✨ Aucun joueur n\'est actuellement maudit!');
        }

        const listEmbed = new EmbedBuilder()
          .setColor(0x9400D3)
          .setTitle('👹 Liste des Joueurs Maudits')
          .setDescription('Voici tous les malheureux actuellement sous malédiction :')
          .setTimestamp();

        for (const [userId, curseData] of cursedPlayers) {
          const user = await message.guild.members.fetch(userId).catch(() => null);
          if (user) {
            const timeLeft = Math.ceil((curseData.endTime - Date.now()) / 60000);
            const curse = CURSES[curseData.type];
            listEmbed.addFields({
              name: `${curse.emoji} ${user.user.username}`,
              value: `**Malédiction**: ${curse.name}\n**Temps restant**: ${timeLeft} minute(s)`,
              inline: true
            });
          }
        }

        return message.reply({ embeds: [listEmbed] });
      }

      let targetMember;
      let duration = 5; // Durée par défaut : 5 minutes

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
          return message.reply('❌ Aucun joueur disponible dans les salons vocaux!');
        }

        targetMember = allVoiceMembers[Math.floor(Math.random() * allVoiceMembers.length)];

        if (args[1]) {
          const potDuration = parseInt(args[1]);
          if (!isNaN(potDuration)) {
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
            content: '❌ **Erreur**: Tu dois mentionner un joueur ou utiliser `random`!\n' +
              '**Exemples**:\n' +
              '`!curse @joueur 10` - Maudit un joueur pour 10 minutes\n' +
              '`!curse random 5` - Maudit un joueur aléatoire en vocal pour 5 minutes\n' +
              '`!curse list` - Affiche les joueurs maudits\n' +
              '`!curse clear` - Lève toutes les malédictions (admin)'
          });
        }

        if (args[1]) {
          const potDuration = parseInt(args[1]);
          if (!isNaN(potDuration)) {
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
            await message.author.send('❌ La durée doit être un nombre supérieur à 0!');
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
        return message.reply('❌ La durée doit être un nombre supérieur à 0!');
      }

      if (duration > 30) {
        if (hiddenMode) {
          try {
            await message.author.send('❌ La durée maximale est de 30 minutes!');
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
        return message.reply('❌ La durée maximale est de 30 minutes!');
      }

      // Empêche de maudire un bot
      if (targetMember.user.bot) {
        if (hiddenMode) {
          try {
            await message.author.send('❌ Tu ne peux pas maudire un bot!');
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }
        return message.reply('❌ Tu ne peux pas maudire un bot!');
      }

      // Vérifie si le joueur est déjà maudit
      if (cursedPlayers.has(targetMember.id)) {
        const curseData = cursedPlayers.get(targetMember.id);
        const timeLeft = Math.ceil((curseData.endTime - Date.now()) / 60000);

        if (hiddenMode) {
          try {
            await message.author.send(
              `❌ ${targetMember.user.username} est déjà maudit!\n` +
              `⏱️ **Temps restant**: ${timeLeft} minute(s)`
            );
          } catch (err) {
            console.error('Impossible d\'envoyer un MP:', err);
          }
          return;
        }

        return message.reply(
          `❌ ${targetMember.user.username} est déjà maudit!\n` +
          `⏱️ **Temps restant**: ${timeLeft} minute(s)`
        );
      }

      // Choisit une malédiction aléatoire ou utilise celle spécifiée
      let randomCurseType;
      if (selectedCurseType) {
        randomCurseType = selectedCurseType;
      } else {
        const curseTypes = Object.keys(CURSES);
        randomCurseType = curseTypes[Math.floor(Math.random() * curseTypes.length)];
      }
      const selectedCurse = CURSES[randomCurseType];

      const endTime = Date.now() + (duration * 60000);

      // Annonce dramatique (sauf en mode caché)
      if (!hiddenMode) {
        const announceEmbed = new EmbedBuilder()
          .setColor(0x9400D3)
          .setTitle('👹 INVOCATION DE MALÉDICTION')
          .setDescription(
            `🌙 *Les forces obscures se rassemblent...*\n\n` +
            `🎯 **Cible**: ${targetMember.user.username}\n` +
            `⏳ **Durée**: ${duration} minute(s)\n\n` +
            `*La malédiction est en cours d'incantation...*`
          )
          .setThumbnail('https://media.tenor.com/oqKD0X5sQ58AAAAM/dark-magic.gif')
          .setFooter({ text: `Invoqué par ${message.author.username}` })
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
        challengePhrase = CHALLENGE_PHRASES[Math.floor(Math.random() * CHALLENGE_PHRASES.length)];
        // Injection de caractères invisibles (\u200B) pour bloquer le copier-coller simple
        trapPhrase = challengePhrase.split('').map(char =>
          Math.random() < 0.2 ? char + '\u200B' : char
        ).join('');
        extraEffect = `\n📝 **TA PHRASE À COPIER (INTERDIT DE COPIER-COLLER !)**:\n\`${trapPhrase}\`\n\n*Le chat et le vocal sont bloqués tant que tu ne l'as pas posté !*`;
      }

      if ((randomCurseType === 'VOICE_MUTE' || randomCurseType === 'CHALLENGE') && targetMember.voice.channel) {
        try {
          await targetMember.voice.setMute(true, `Malédiction - ${duration} min`);
          extraEffect += '\n🔇 **Le joueur a été muté dans le vocal!**';
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
          const shameMessages = [
            `😂 ${targetMember} est toujours maudit !`,
            `👻 Quelqu'un a vu ${targetMember} ? Il est maudit lol`,
            `🤡 ${targetMember} pense qu'il peut échapper à la malédiction`,
            `💀 ${targetMember} est un joueur maudit, évitez-le!`
          ];

          if (Math.random() < 0.3) { // 30% de chance toutes les 30s
            const randomMsg = shameMessages[Math.floor(Math.random() * shameMessages.length)];
            message.channel.send(randomMsg).catch(() => { });
          }
        }

        // Effet de spam
        if (randomCurseType === 'SPAM' && Date.now() < endTime) {
          if (Math.random() < 0.2) { // 20% de chance toutes les 2s (ajusté car intervalle plus court)
            const spamMessages = [
              `${targetMember} PING! 🏓`,
              `Hey ${targetMember}, tu es toujours maudit 👻`,
              `${targetMember} *bip bip* Rappel de malédiction 📢`,
              `${targetMember} Ne m'oublie pas ! 😈`
            ];
            const randomMsg = spamMessages[Math.floor(Math.random() * spamMessages.length)];
            message.channel.send(randomMsg).catch(() => { });
          }
        }

        // Mute forcé pour VOICE_MUTE et CHALLENGE
        if ((randomCurseType === 'VOICE_MUTE' || randomCurseType === 'CHALLENGE') && Date.now() < endTime) {
          try {
            const currentMember = await message.guild.members.fetch(targetMember.id);
            if (currentMember.voice.channel && !currentMember.voice.serverMute) {
              await currentMember.voice.setMute(true, 'Force Mute Malédiction');
            }
          } catch (err) {
            // Ignore les erreurs de mute
          }
        }

      }, 2000); // Vérifie toutes les 2 secondes (plus réactif pour le challenge)

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
          .setTitle(`${selectedCurse.emoji} MALÉDICTION LANCÉE!`)
          .setDescription(
            `💀 **${targetMember.user.username}** a été maudit!\n\n` +
            `**Malédiction**: ${selectedCurse.name}\n` +
            `**Effet**: ${selectedCurse.description}\n` +
            `**Durée**: ${duration} minute(s)\n` +
            `**Fin**: <t:${Math.floor(endTime / 1000)}:R>${extraEffect}\n\n` +
            `*Que les ténèbres l'accompagnent...*`
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media.tenor.com/Y3bzC_SEtfMAAAAM/evil-laugh-laughing.gif')
          .setFooter({ text: `Maudit par ${message.author.username} | Bonne chance!` })
          .setTimestamp();

        await message.channel.send({ embeds: [curseEmbed] });
      } else {
        // En mode caché, envoie juste une confirmation en MP
        try {
          const confirmEmbed = new EmbedBuilder()
            .setColor(selectedCurse.color)
            .setTitle(`${selectedCurse.emoji} Malédiction Cachée Activée`)
            .setDescription(
              `✅ **${targetMember.user.username}** a été maudit secrètement!\n\n` +
              `**Malédiction**: ${selectedCurse.name}\n` +
              `**Effet**: ${selectedCurse.description}\n` +
              `**Durée**: ${duration} minute(s)\n` +
              `**Fin**: <t:${Math.floor(endTime / 1000)}:R>${extraEffect}\n\n` +
              `*La cible ne sait pas qui l'a maudit... 😈*`
            )
            .setFooter({ text: 'Message privé - Personne d\'autre ne voit ça' })
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
            await member.voice.setMute(false, 'Fin de la malédiction').catch(() => { });
          }
        }

        const liftEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✨ Malédiction Levée')
          .setDescription(
            `🎉 **${targetMember.user.username}** est libéré de la malédiction!\n\n` +
            `La ${selectedCurse.name} a pris fin.\n` +
            `👤 **Maudit par**: ${message.author.username}`
          )
          .setFooter({ text: 'Tu es libre!' })
          .setTimestamp();

        message.channel.send({ embeds: [liftEmbed] });
      }, duration * 60000);

    } catch (error) {
      console.error('Erreur dans la commande curse:', error);
      message.reply('❌ Une erreur est survenue lors du lancement de la malédiction.');
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
  getRandomResponse() {
    return RANDOM_RESPONSES[Math.floor(Math.random() * RANDOM_RESPONSES.length)];
  },

  // Exporte les types de malédictions pour le commandHandler
  CURSES
};
