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
  
  async execute(message, args) {
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
      embeds: [createEmbed('⚡ TEST DE RÉACTION', 'Préparez-vous... Le bouton va changer ! ⏳')],
      components: [createRow('Attendez...', ButtonStyle.Secondary)]
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
        embeds: [createEmbed('🔥 CLIQUEZ !! 🔥', 'C\'EST MAINTENANT ! ⚡', 0x2ECC71)],
        components: [createRow('CLIQUEZ ICI !', ButtonStyle.Success)]
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
          embeds: [createEmbed('❌ FAUX DÉPART !', `**${interaction.user.username}** a cliqué trop tôt ! La partie est annulée.`, 0xE74C30)],
          components: [createRow('Trop tôt !', ButtonStyle.Danger, true)]
        });
      } else {
        // Gagné !
        isGameOver = true;
        collector.stop('win');
        const endTime = Date.now();
        const reactionTime = endTime - startTime;

        return interaction.update({
          embeds: [createEmbed('🏆 GAGNÉ !', `**${interaction.user.username}** a été le plus rapide !\n\n**Temps de réaction :** \`${reactionTime} ms\` ⏱️`, 0xF1C40F)],
          components: [createRow('Terminé !', ButtonStyle.Secondary, true)]
        });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && !isGameOver) {
        gameMessage.edit({
          embeds: [createEmbed('⏰ TEMPS ÉCOULÉ', 'Personne n\'a cliqué à temps...', 0x95A5A6)],
          components: [createRow('Expiré', ButtonStyle.Secondary, true)]
        }).catch(() => {});
      }
    });
  }
};
