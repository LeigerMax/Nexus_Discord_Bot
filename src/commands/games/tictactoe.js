const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'morpion',
  aliases: ['tictactoe', 'ttt'],
  description: 'Lance une partie de Morpion (Solo contre le bot ou Multi)',
  usage: '!morpion [@joueur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    const opponent = message.mentions.users.first();
    const isSolo = !opponent || opponent.id === message.client.user.id || opponent.bot;
    
    if (!isSolo && opponent.id === message.author.id) {
      return message.reply(t('tictactoe.self_error'));
    }

    const players = {
      X: message.author,
      O: isSolo ? message.client.user : opponent
    };

    // État du jeu : Array de 9 cases (0-8)
    // null: vide, 'X', 'O'
    let board = Array(9).fill(null);
    let currentPlayer = 'X'; // X commence toujours
    let isGameOver = false;
    let winner = null;

    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Lignes
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colonnes
      [0, 4, 8], [2, 4, 6]             // Diagonales
    ];

    const checkWin = (tempBoard) => {
      for (const line of winningLines) {
        const [a, b, c] = line;
        if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
          return tempBoard[a];
        }
      }
      if (tempBoard.every(cell => cell !== null)) return 'draw';
      return null;
    };

    const createRows = () => {
      const rows = [];
      for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
          const index = i * 3 + j;
          const button = new ButtonBuilder()
            .setCustomId(`ttt_${index}`)
            .setLabel(board[index] ? ' ' : '?')
            .setStyle(board[index] === 'X' ? ButtonStyle.Primary : (board[index] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary))
            .setDisabled(isGameOver || board[index] !== null || (isSolo && currentPlayer === 'O'));
          
          if (board[index] === 'X') button.setEmoji('❌');
          if (board[index] === 'O') button.setEmoji('⭕');
          
          row.addComponents(button);
        }
        rows.push(row);
      }
      return rows;
    };

    const getStatusText = () => {
      if (winner === 'draw') return t('tictactoe.status_draw');
      if (winner) return t('tictactoe.status_win', { user: players[winner].username, symbol: winner });
      return t('tictactoe.status_turn', { user: players[currentPlayer].username, symbol: currentPlayer });
    };

    const createEmbed = () => {
      return new EmbedBuilder()
        .setColor(winner ? (winner === 'draw' ? 0x95A5A6 : (winner === 'X' ? 0x3498DB : 0xE74C30)) : 0xF1C40F)
        .setTitle(t('tictactoe.title'))
        .setDescription(`${getStatusText()}\n\n**X :** ${players.X}\n**O :** ${players.O}`)
        .setFooter({ text: isSolo ? t('tictactoe.footer_solo') : t('tictactoe.footer_multi') })
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

    const botMove = async () => {
      if (!isSolo || isGameOver || currentPlayer !== 'O') return;

      // Un petit délai pour simuler la réflexion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const availableSpots = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
      if (availableSpots.length === 0) return;

      // IA basique :
      // 1. Tenter de gagner
      // 2. Bloquer l'adversaire
      // 3. Jouer au milieu si possible
      // 4. Random
      
      let move = -1;
      
      // 1 & 2. Gagner ou Bloquer
      for (const p of ['O', 'X']) {
        for (const line of winningLines) {
          const cells = line.map(idx => board[idx]);
          const countP = cells.filter(c => c === p).length;
          const countNull = cells.filter(c => c === null).length;
          if (countP === 2 && countNull === 1) {
            move = line[cells.indexOf(null)];
            break;
          }
        }
        if (move !== -1) break;
      }

      if (move === -1) {
        if (board[4] === null) move = 4;
        else move = availableSpots[Math.floor(Math.random() * availableSpots.length)];
      }

      board[move] = 'O';
      const result = checkWin(board);
      if (result) {
        isGameOver = true;
        winner = result;
        collector.stop();
      } else {
        currentPlayer = 'X';
      }

      await gameMessage.edit({
        embeds: [createEmbed()],
        components: createRows()
      }).catch(() => {});
    };

    collector.on('collect', async (interaction) => {
      const pId = players[currentPlayer].id;
      if (interaction.user.id !== pId) {
        return interaction.reply({ content: t('tictactoe.not_your_turn', { user: pId }), ephemeral: true });
      }

      const index = parseInt(interaction.customId.split('_')[1]);
      board[index] = currentPlayer;

      const result = checkWin(board);
      if (result) {
        isGameOver = true;
        winner = result;
        collector.stop();
      } else {
        currentPlayer = (currentPlayer === 'X' ? 'O' : 'X');
      }

      await interaction.update({
        embeds: [createEmbed()],
        components: createRows()
      });

      // Si c'est au tour du bot
      if (isSolo && !isGameOver && currentPlayer === 'O') {
        await botMove();
      }
    });

    collector.on('end', () => {
      gameMessage.edit({ components: createRows() }).catch(() => {});
    });
  }
};
