const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'memory',
  description: 'Lance une partie de Jeu de Mémoire (4x4)',
  usage: '!memory',
  
  async execute(message, _args, context) {
    const { t } = context;
    const emojis = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🥝', '🍍'];
    // On double les emojis pour faire des paires et on mélange
    let boardContent = [...emojis, ...emojis];
    for (let i = boardContent.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [boardContent[i], boardContent[j]] = [boardContent[j], boardContent[i]];
    }

    let matched = new Set();
    let selected = []; // Stocke les positions [index, emoji]
    let tries = 0;
    let isGameOver = false;
    let isWaiting = false; // Pour empêcher de cliquer pendant le délai de non-match

    const createRows = (currentSelected = []) => {
      const rows = [];
      for (let i = 0; i < 4; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 4; j++) {
          const index = i * 4 + j;
          const isMatched = matched.has(index);
          const isSelected = currentSelected.some(s => s.index === index);
          
          const button = new ButtonBuilder()
            .setCustomId(`mem_${index}`)
            .setLabel((isMatched || isSelected) ? ' ' : '?')
            .setStyle(isMatched ? ButtonStyle.Success : (isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary))
            .setDisabled(isGameOver || isMatched || isSelected || isWaiting);
          
          if (isMatched || isSelected) {
            button.setEmoji(boardContent[index]);
          }
          
          row.addComponents(button);
        }
        rows.push(row);
      }
      return rows;
    };

    const createEmbed = (statusKey = 'memory.status_initial') => {
      return new EmbedBuilder()
        .setColor(isGameOver ? 0x2ECC71 : 0x9B59B6)
        .setTitle(t('memory.title'))
        .setDescription(
          `**${t('hangman.status_label')} :** ${t(statusKey)}\n\n` +
          `**${t('memory.label_tries')} :** \`${tries}\` | **${t('memory.label_pairs')} :** \`${matched.size / 2} / 8\``
        )
        .setFooter({ text: t('memory.footer', { user: message.author.username }) })
        .setTimestamp();
    };

    const gameMessage = await message.reply({
      embeds: [createEmbed()],
      components: createRows()
    });

    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: t('memory.only_player_error'), ephemeral: true });
      }

      const index = parseInt(interaction.customId.split('_')[1]);
      const emoji = boardContent[index];

      selected.push({ index, emoji });

      if (selected.length === 1) {
        // Premier clic
        await interaction.update({
          components: createRows(selected)
        });
      } else if (selected.length === 2) {
        // Deuxième clic
        tries++;
        const [first, second] = selected;

        if (first.emoji === second.emoji) {
          // C'est un match !
          matched.add(first.index);
          matched.add(second.index);
          selected = [];

          if (matched.size === boardContent.length) {
            isGameOver = true;
            collector.stop();
            await interaction.update({
              embeds: [createEmbed('memory.status_win')],
              components: createRows()
            });
          } else {
            await interaction.update({
              embeds: [createEmbed('memory.status_match')],
              components: createRows()
            });
          }
        } else {
          // Pas de match
          isWaiting = true;
          await interaction.update({
            embeds: [createEmbed('memory.status_no_match')],
            components: createRows(selected)
          });

          // Petit délai puis on cache
          setTimeout(async () => {
            selected = [];
            isWaiting = false;
            await gameMessage.edit({
              embeds: [createEmbed()],
              components: createRows()
            }).catch(() => {});
          }, 1500);
        }
      }
    });

    collector.on('end', () => {
      if (!isGameOver) {
        gameMessage.edit({ components: createRows() }).catch(() => {});
      }
    });
  }
};
