const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'reaction',
  aliases: ['react', 'test'],
  description: 'Lance un test de réaction multijoueur (tout le serveur)',
  usage: '!reaction',
  
  async execute(message, _args, context) {
    const { t } = context;
    let isTriggered = false;
    let isGameOver = false;
    let startTime = 0;

    const createEmbed = (title, status, color = 0xF1C40F) => {
      return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(status)
        .setTimestamp();
    };

    const createRow = (label, style, disabled = false) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('react_button')
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );
    };

    const gameMessage = await message.reply({
      embeds: [createEmbed(t('reaction.title'), t('reaction.wait_status'))],
      components: [createRow(t('reaction.wait_btn'), ButtonStyle.Secondary)]
    });

    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000 // 30 secondes max
    });

    // Délai aléatoire entre 2 et 7 secondes
    const delay = Math.floor(Math.random() * 5000) + 2000;

    const triggerTimeout = setTimeout(async () => {
      if (isGameOver) return;
      isTriggered = true;
      startTime = Date.now();
      
      await gameMessage.edit({
        embeds: [createEmbed(t('reaction.trigger_title'), t('reaction.trigger_status'), 0x2ECC71)],
        components: [createRow(t('reaction.trigger_btn'), ButtonStyle.Success)]
      }).catch(() => {});
    }, delay);

    collector.on('collect', async (interaction) => {
      if (isGameOver) return;

      if (!isTriggered) {
        // Faux départ !
        isGameOver = true;
        clearTimeout(triggerTimeout);
        collector.stop('false_start');
        
        return interaction.update({
          embeds: [createEmbed(t('reaction.false_start_title'), t('reaction.false_start_desc', { user: interaction.user.username }), 0xE74C30)],
          components: [createRow(t('reaction.false_start_btn'), ButtonStyle.Danger, true)]
        });
      } else {
        // Gagné !
        isGameOver = true;
        collector.stop('win');
        const endTime = Date.now();
        const reactionTime = endTime - startTime;

        return interaction.update({
          embeds: [createEmbed(t('reaction.win_title'), t('reaction.win_desc', { user: interaction.user.username, time: reactionTime }), 0xF1C40F)],
          components: [createRow(t('reaction.win_btn'), ButtonStyle.Secondary, true)]
        });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && !isGameOver) {
        gameMessage.edit({
          embeds: [createEmbed(t('reaction.timeout_title'), t('reaction.timeout_status'), 0x95A5A6)],
          components: [createRow(t('reaction.timeout_btn'), ButtonStyle.Secondary, true)]
        }).catch(() => {});
      }
    });
  }
};
