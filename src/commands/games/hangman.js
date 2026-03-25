const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'hangman',
  aliases: ['pendu'],
  description: 'Lance une partie de Pendu flash',
  usage: '!hangman',
  
  async execute(message, _args) {
    // Gestion du multijoueur (mentions)
    const mentions = message.mentions.users;
    const allowedUserIds = new Set([message.author.id]);
    mentions.forEach(user => allowedUserIds.add(user.id));
    
    const playersList = Array.from(allowedUserIds).map(id => `<@${id}>`).join(', ');

    const words = [
      'DISCORD', 'BOT', 'PROGRAMMATION', 'JAVASCRIPT', 'NODEJS',
      'DEVELOPPEUR', 'INTERFACE', 'COMMANDES', 'SERVEUR', 'MESSAGE',
      'MYSTERE', 'AVENTURE', 'PIERRE', 'SOLEIL', 'MUSIQUE', 'GUITARE',
      'ORDINATEUR', 'INTERNET', 'CLAVIER', 'SOURIS', 'ECRAN', 'ROBOT',
      'ESPACE', 'PLANETE', 'ETOILE', 'GALAXIE', 'UNIVERS', 'COSMOS',
      'VOYAGE', 'DESTINATION', 'VALISE', 'PASSEPORT', 'AVION', 'TRAIN',
      'BATEAU', 'VOITURE', 'VELO', 'MARCHE', 'COURSE', 'SPORT',
      'FOOTBALL', 'BASKETBALL', 'TENNIS', 'NATATION', 'ESCRIME',
      'Cuisine', 'RECETTE', 'GATEAU', 'CHOCOLAT', 'VANILLE', 'FRUIT'
    ];
    
    const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
    const revealedLetters = new Set();
    let lives = 7;
    const guessedLetters = new Set();
    
    const hangmanStages = [
      `
  +---+
  |   |
      |
      |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
      `
  💥 BOUM ! 💥
  +---+
  |   |
 [O]  |
 /|\\  |
 / \\  |
      |
=========`
    ];
    
    const getDisplayWord = () => {
      return word.split('').map(letter => revealedLetters.has(letter) ? letter : '\\_').join(' ');
    };
    
    const createEmbed = (status = 'En cours...') => {
      // Calcul de l'index du dessin : plus on perd de vies, plus on avance
      // 7 vies au total. Index 0 = 7 vies, Index 1 = 6 vies... Index 7 = 0 vies.
      const stageIndex = Math.min(7 - lives, hangmanStages.length - 1);
      
      return new EmbedBuilder()
        .setColor(lives > 2 ? 0x3498DB : 0xE74C30)
        .setTitle('🎮 JEU DU PENDU (MULTI)')
        .setDescription(`**Joueurs :** ${playersList}\n**Statut :** ${status}\n\`\`\`${hangmanStages[stageIndex]}\`\`\`\n\n**Mot :** ${getDisplayWord()}\n\n**Lettres tentées :** ${Array.from(guessedLetters).sort().join(', ') || 'Aucune'}\n**Vies restantes :** ${'❤️'.repeat(lives)}${'🖤'.repeat(7-lives)}`)
        .setFooter({ text: `Tape une lettre pour jouer !` })
        .setTimestamp();
    };
    
    const gameMessage = await message.reply({
      embeds: [createEmbed()]
    });
    
    const collector = message.channel.createMessageCollector({
      filter: m => allowedUserIds.has(m.author.id) && m.content.length === 1 && /[a-zA-Z]/.test(m.content),
      time: 300000 // 5 minutes
    });
    
    collector.on('collect', async (m) => {
      const letter = m.content.toUpperCase();
      
      // On supprime le message du joueur pour garder le chat propre (si perms)
      if (m.deletable) m.delete().catch(() => {});
      
      if (guessedLetters.has(letter)) {
        return; // Lettre déjà tentée
      }
      
      guessedLetters.add(letter);
      
      if (word.includes(letter)) {
        revealedLetters.add(letter);
        
        // Vérifie la victoire
        if (word.split('').every(l => revealedLetters.has(l))) {
          collector.stop('win');
          return gameMessage.edit({
            embeds: [createEmbed('🏆 VICTOIRE !')]
          });
        }
      } else {
        lives--;
        
        // Vérifie la défaite
        if (lives <= 0) {
          collector.stop('lost');
          return gameMessage.edit({
            embeds: [createEmbed(`💀 PERDU ! Le mot était **${word}**`)]
          });
        }
      }
      
      // Mise à jour de l'embed
      await gameMessage.edit({
        embeds: [createEmbed()]
      });
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        gameMessage.edit({
          content: '⏰ Temps écoulé ! La partie est terminée.',
          embeds: [createEmbed(`Fin du temps. Le mot était **${word}**`)]
        }).catch(() => {});
      }
    });
  }
};
