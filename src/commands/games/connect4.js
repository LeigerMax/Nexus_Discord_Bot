const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'p4',
  aliases: ['connect4', 'puissance4'],
  description: 'Lance une partie de Puissance 4 (Solo ou Multi)',
  usage: '!p4 [@joueur]',
  
  async execute(message, args) {
    const opponent = message.mentions.users.first();
    const isSolo = !opponent || opponent.id === message.client.user.id || opponent.bot;
    
    if (!isSolo && opponent.id === message.author.id) {
      return message.reply('❌ Tu ne peux pas jouer contre toi-même !');
    }

    const players = {
      1: message.author,
      2: isSolo ? message.client.user : opponent
    };

    const ROWS = 6;
    const COLS = 7;
    // null: vide, 1: Rouge (Joueur 1), 2: Jaune (Joueur 2/Bot)
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    let currentPlayer = 1;
    let isGameOver = false;
    let winner = null;

    const checkWin = (b, p) => {
      // Horizontal
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
          if (b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) return true;
        }
      }
      // Vertical
      for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
          if (b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) return true;
        }
      }
      // Diagonale positive
      for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
          if (b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) return true;
        }
      }
      // Diagonale négative
      for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
          if (b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) return true;
        }
      }
      return false;
    };

    const isFull = (b) => {
      return b[0].every(cell => cell !== null);
    };

    const renderBoard = () => {
      let display = '';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = board[r][c];
          display += cell === 1 ? '🔴' : (cell === 2 ? '🟡' : '⚪');
        }
        display += '\n';
      }
      display += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
      return display;
    };

    const createRows = () => {
      const rows = [];
      const row1 = new ActionRowBuilder();
      const row2 = new ActionRowBuilder();
      
      for (let c = 0; c < COLS; c++) {
        const isColumnFull = board[0][c] !== null;
        const button = new ButtonBuilder()
          .setCustomId(`p4_${c}`)
          .setLabel((c + 1).toString())
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isGameOver || isColumnFull || (isSolo && currentPlayer === 2));
        
        if (c < 5) row1.addComponents(button);
        else row2.addComponents(button);
      }
      rows.push(row1, row2);
      return rows;
    };

    const createEmbed = () => {
      let status = '';
      if (winner === 'draw') status = '🤝 **Match nul !** La grille est pleine.';
      else if (winner) status = `🏆 **${players[winner].username} a gagné !**`;
      else status = `👉 C'est au tour de **${players[currentPlayer].username}** (${currentPlayer === 1 ? '🔴' : '🟡'})`;

      return new EmbedBuilder()
        .setColor(winner ? (winner === 1 ? 0xE74C30 : (winner === 2 ? 0xF1C40F : 0x95A5A6)) : 0x3498DB)
        .setTitle('🔴 PUISSANCE 4 🟡')
        .setDescription(`${status}\n\n${renderBoard()}\n\n**🔴 :** ${players[1]}\n**🟡 :** ${players[2]}`)
        .setFooter({ text: isSolo ? 'Mode Solo vs Bot' : 'Mode Multi' })
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

    const dropPiece = (b, col, p) => {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (b[r][col] === null) {
          b[r][col] = p;
          return r;
        }
      }
      return -1;
    };

    const botMove = async () => {
      if (!isSolo || isGameOver || currentPlayer !== 2) return;
      await new Promise(resolve => setTimeout(resolve, 1500));

      let move = -1;
      const validCols = [];
      for (let c = 0; c < COLS; c++) if (board[0][c] === null) validCols.push(c);

      // Simple AI
      // 1. Gagner
      for (const c of validCols) {
        let tempBoard = board.map(r => [...r]);
        dropPiece(tempBoard, c, 2);
        if (checkWin(tempBoard, 2)) { move = c; break; }
      }
      // 2. Bloquer
      if (move === -1) {
        for (const c of validCols) {
          let tempBoard = board.map(r => [...r]);
          dropPiece(tempBoard, c, 1);
          if (checkWin(tempBoard, 1)) { move = c; break; }
        }
      }
      // 3. Centre
      if (move === -1 && validCols.includes(3)) move = 3;
      // 4. Random
      if (move === -1) move = validCols[Math.floor(Math.random() * validCols.length)];

      dropPiece(board, move, 2);
      if (checkWin(board, 2)) {
        isGameOver = true;
        winner = 2;
        collector.stop();
      } else if (isFull(board)) {
        isGameOver = true;
        winner = 'draw';
        collector.stop();
      } else {
        currentPlayer = 1;
      }

      await gameMessage.edit({
        embeds: [createEmbed()],
        components: createRows()
      }).catch(() => {});
    };

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== players[currentPlayer].id) {
        return interaction.reply({ content: `❌ Ce n'est pas ton tour ! C'est à <@${players[currentPlayer].id}> de jouer.`, ephemeral: true });
      }

      const col = parseInt(interaction.customId.split('_')[1]);
      dropPiece(board, col, currentPlayer);

      if (checkWin(board, currentPlayer)) {
        isGameOver = true;
        winner = currentPlayer;
        collector.stop();
      } else if (isFull(board)) {
        isGameOver = true;
        winner = 'draw';
        collector.stop();
      } else {
        currentPlayer = (currentPlayer === 1 ? 2 : 1);
      }

      await interaction.update({
        embeds: [createEmbed()],
        components: createRows()
      });

      if (isSolo && !isGameOver && currentPlayer === 2) {
        await botMove();
      }
    });

    collector.on('end', () => {
      gameMessage.edit({ components: createRows() }).catch(() => {});
    });
  }
};
