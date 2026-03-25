const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'minesweeper',
  description: 'Lance une partie de démineur flash (5x5)',
  usage: '!minesweeper [mines]',
  
  async execute(message, args) {
    const size = 5;
    const numMines = parseInt(args[0]) || 4;
    
    // Limite le nombre de mines pour que ce soit jouable
    const actualMines = Math.min(Math.max(numMines, 1), 15);
    
    // Initialise la grille
    // -1: mine, 0-8: nombre de mines adjacentes
    const grid = Array(size).fill().map(() => Array(size).fill(0));
    const revealed = Array(size).fill().map(() => Array(size).fill(false));
    
    // Place les mines
    let minesPlaced = 0;
    while (minesPlaced < actualMines) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (grid[r][c] !== -1) {
        grid[r][c] = -1;
        minesPlaced++;
      }
    }
    
    // Calcule les chiffres adjacents
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === -1) continue;
        
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === -1) {
              count++;
            }
          }
        }
        grid[r][c] = count;
      }
    }
    

    
    const createRows = (isFinished = false, _win = false) => {
      const rows = [];
      for (let r = 0; r < size; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < size; c++) {
          const button = new ButtonBuilder()
            .setCustomId(`mine_${r}_${c}`);
            
          if (revealed[r][c] || isFinished) {
            const label = grid[r][c] === 0 || grid[r][c] === -1 ? ' ' : grid[r][c].toString();
            button.setLabel(label)
              .setDisabled(true);
              
            const emoji = grid[r][c] === -1 ? '💣' : (grid[r][c] === 0 ? '🟦' : null);
            if (emoji) button.setEmoji(emoji);
              
            if (grid[r][c] === -1) {
              button.setStyle(ButtonStyle.Danger);
            } else if (revealed[r][c]) {
              button.setStyle(ButtonStyle.Success);
            } else {
              button.setStyle(ButtonStyle.Secondary);
            }
          } else {
            button.setLabel('?').setStyle(ButtonStyle.Secondary);
          }
          row.addComponents(button);
        }
        rows.push(row);
      }
      return rows;
    };
    
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('💣 DÉMINEUR FLASH')
      .setDescription(`Trouve toutes les cases libres sans toucher les **${actualMines}** mines !

**Comment jouer :**
- Cliquez sur un bouton **[ ? ]** pour révéler une case.
- 🟦 = Case vide (aucune mine autour).
- 1️⃣, 2️⃣... = Nombre de mines dans les 8 cases adjacentes.
- 💣 = MINE ! La partie s'arrête si vous en touchez une.

*Objectif : Révéler toutes les cases qui ne contiennent pas de mine.*`)
      .setFooter({ text: `Partie de ${message.author.username}` })
      .setTimestamp();
      
    const gameMessage = await message.reply({
      embeds: [embed],
      components: createRows()
    });
    
    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });
    
    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
      }
      
      const [, r, c] = interaction.customId.split('_').map(Number);
      
      if (grid[r][c] === -1) {
        // PERDU
        collector.stop('lost');
        const lostEmbed = EmbedBuilder.from(embed)
          .setColor(0xFF0000)
          .setTitle('💥 BOUM !')
          .setDescription(`Tu as touché une mine en [${r+1}, ${c+1}] ! Dommage...`);
          
        return interaction.update({
          embeds: [lostEmbed],
          components: createRows(true, false)
        });
      }
      
      // RÉVÉLATION
      const reveal = (row, col) => {
        if (row < 0 || row >= size || col < 0 || col >= size || revealed[row][col]) return;
        revealed[row][col] = true;
        
        // Si c'est une case vide (0), on révèle les voisines
        if (grid[row][col] === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              reveal(row + dr, col + dc);
            }
          }
        }
      };
      
      reveal(r, c);
      
      // Vérifie la victoire
      let safeCellsRevealed = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (revealed[i][j] && grid[i][j] !== -1) safeCellsRevealed++;
        }
      }
      
      if (safeCellsRevealed === (size * size) - actualMines) {
        // VICTOIRE
        collector.stop('win');
        const winEmbed = EmbedBuilder.from(embed)
          .setColor(0x00FF00)
          .setTitle('🏆 VICTOIRE !')
          .setDescription(`Félicitations ! Tu as déminé tout le terrain sans encombre !`);
          
        return interaction.update({
          embeds: [winEmbed],
          components: createRows(true, true)
        });
      }
      
      // Continue le jeu
      await interaction.update({
        components: createRows()
      });
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        gameMessage.edit({ 
          content: '⏰ Temps écoulé pour cette partie !',
          components: createRows(true, false) 
        }).catch(() => {});
      }
    });
  }
};
