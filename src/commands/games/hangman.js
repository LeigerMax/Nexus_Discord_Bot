const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'hangman',
  aliases: ['pendu'],
  description: 'Lance une partie de Pendu flash',
  usage: '!hangman',
  
  async execute(message, _args, context) {
    const { t } = context;
    // Gestion du multijoueur (mentions)
    const mentions = message.mentions.users;
    const allowedUserIds = new Set([message.author.id]);
    mentions.forEach(user => allowedUserIds.add(user.id));
    
    const playersList = Array.from(allowedUserIds).map(id => `<@${id}>`).join(', ');

    const words = t('hangman.words', { returnObjects: true });
    
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
    
    const createEmbed = (statusKey = 'hangman.status_ongoing', params = {}) => {
      const stageIndex = Math.min(7 - lives, hangmanStages.length - 1);
      
      return new EmbedBuilder()
        .setColor(lives > 2 ? 0x3498DB : 0xE74C30)
        .setTitle(`🎮 ${t('help.categories.games').toUpperCase()}`)
        .setDescription(
          `**${t('hangman.players_label')} :** ${playersList}\n` +
          `**${t('hangman.status_label')} :** ${t(statusKey, params)}\n` +
          `\`\`\`${hangmanStages[stageIndex]}\`\`\`\n\n` +
          `**${t('hangman.word_label')} :** ${getDisplayWord()}\n\n` +
          `**${t('hangman.attempts_label')} :** ${Array.from(guessedLetters).sort().join(', ') || t('hangman.none')}\n` +
          `**${t('hangman.lives_label')} :** ${'❤️'.repeat(lives)}${'🖤'.repeat(7-lives)}`
        )
        .setFooter({ text: t('hangman.footer') })
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
      
      if (m.deletable) m.delete().catch(() => {});
      
      if (guessedLetters.has(letter)) return;
      
      guessedLetters.add(letter);
      
      if (word.includes(letter)) {
        revealedLetters.add(letter);
        if (word.split('').every(l => revealedLetters.has(l))) {
          collector.stop('win');
          return gameMessage.edit({
            embeds: [createEmbed('hangman.status_win')]
          });
        }
      } else {
        lives--;
        if (lives <= 0) {
          collector.stop('lost');
          return gameMessage.edit({
            embeds: [createEmbed('hangman.status_lost', { word })]
          });
        }
      }
      
      await gameMessage.edit({
        embeds: [createEmbed()]
      });
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        gameMessage.edit({
          content: t('hangman.timeout_msg'),
          embeds: [createEmbed('hangman.timeout_status', { word })]
        }).catch(() => {});
      }
    });
  }
};
