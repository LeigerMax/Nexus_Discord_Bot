const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle
} = require('discord.js');

module.exports = {
  name: 'battleship',
  aliases: ['bn', 'bataille'],
  description: 'Lance une partie de Bataille Navale avancée (8x8)',
  usage: '!battleship [@joueur]',
  
  async execute(message, _args, context) {
    const { t } = context;
    const opponent = message.mentions.users.first();
    const isSolo = !opponent || opponent.id === message.client.user.id || opponent.bot;
    
    if (!isSolo && opponent.id === message.author.id) {
      return message.reply(t('battleship.self_error'));
    }

    const player1 = message.author;
    const player2 = isSolo ? message.client.user : opponent;

    const SIZE = 8;
    const SHIPS_CONFIG = [
      { key: 'carrier', name: t('battleship.ships.carrier'), size: 5 },
      { key: 'cruiser', name: t('battleship.ships.cruiser'), size: 4 },
      { key: 'destroyer', name: t('battleship.ships.destroyer'), size: 3 },
      { key: 'submarine', name: t('battleship.ships.submarine'), size: 2 }
    ];

    const gameState = {
      p1: { user: player1, board: Array(SIZE).fill().map(() => Array(SIZE).fill(0)), ships: [], ready: false, currentShipIdx: 0, pending: { col: null, line: null, orient: null } },
      p2: { user: player2, board: Array(SIZE).fill().map(() => Array(SIZE).fill(0)), ships: [], ready: isSolo, currentShipIdx: 0, pending: { col: null, line: null, orient: null } },
      phase: 'setup',
      turn: 'p1',
      logs: [t('battleship.logs.start')],
      selectedRow: null
    };

    const isValid = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

    const NUM = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];

    const renderBoard = (board, hideShips = false) => {
      let display = '⬜\ud83c\udde6\u200B\ud83c\udde7\u200B\ud83c\udde8\u200B\ud83c\udde9\u200B\ud83c\uddea\u200B\ud83c\uddeb\u200B\ud83c\uddec\u200B\ud83c\udded\n';
      for (let r = 0; r < SIZE; r++) {
        display += NUM[r + 1];
        for (let c = 0; c < SIZE; c++) {
          const cell = board[r][c];
          if (cell === 0) display += '🌊';
          else if (cell === 1) display += hideShips ? '🌊' : '🚢';
          else if (cell === 2) display += '⚪';
          else if (cell === 3) display += '💥';
        }
        display += '\n';
      }
      return display;
    };

    // --- PLACEMENT ALÉATOIRE ---
    const generateRandomBoard = (pKey) => {
      const p = gameState[pKey];
      p.board = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
      p.ships = [];
      SHIPS_CONFIG.forEach(config => {
        let placed = false;
        while (!placed) {
          const r = Math.floor(Math.random() * SIZE);
          const c = Math.floor(Math.random() * SIZE);
          const horiz = Math.random() > 0.5;
          let canPlace = true;
          for (let i = 0; i < config.size; i++) {
            const nr = r + (horiz ? 0 : i);
            const nc = c + (horiz ? i : 0);
            if (!isValid(nr, nc) || p.board[nr][nc] !== 0) { canPlace = false; break; }
          }
          if (canPlace) {
            const coords = [];
            for (let i = 0; i < config.size; i++) {
              const nr = r + (horiz ? 0 : i);
              const nc = c + (horiz ? i : 0);
              p.board[nr][nc] = 1;
              coords.push({ r: nr, c: nc, hit: false });
            }
            p.ships.push({ name: config.name, coords });
            placed = true;
          }
        }
      });
    };

    if (isSolo) { generateRandomBoard('p2'); gameState.p2.ready = true; }

    // --- EMBEDS SETUP ---
    const createSetupEmbed = (pKey) => {
      const p = gameState[pKey];
      const ship = SHIPS_CONFIG[p.currentShipIdx];
      return new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(t('battleship.setup.title', { user: p.user.username }))
        .setDescription(
          `${renderBoard(p.board)}\n\n` +
          `${t('battleship.setup.ship_label')} : **${ship ? ship.name : t('battleship.setup.all_placed')}** (${ship ? ship.size : 0} cases)\n` +
          `${t('battleship.setup.pos_label')} : \`${p.pending.col || '?'}${p.pending.line || '?'}\` (${p.pending.orient === 'H' ? '→' : p.pending.orient === 'V' ? '↓' : '?'})`
        )
        .setFooter({ text: t('battleship.setup.footer') });
    };

    const createSetupRows = (pKey) => {
      const p = gameState[pKey];
      const done = p.currentShipIdx >= SHIPS_CONFIG.length;
      return [
        new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`bn_col_${pKey}`).setPlaceholder(t('battleship.setup.placeholder_col')).setDisabled(done).addOptions('ABCDEFGH'.split('').map(l => ({ label: l, value: l })))),
        new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`bn_line_${pKey}`).setPlaceholder(t('battleship.setup.placeholder_row')).setDisabled(done).addOptions('12345678'.split('').map(l => ({ label: l, value: l })))),
        new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`bn_orient_${pKey}`).setPlaceholder(t('battleship.setup.placeholder_orient')).setDisabled(done).addOptions([{ label: t('battleship.setup.orient_h'), value: 'H' }, { label: t('battleship.setup.orient_v'), value: 'V' }])),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`bn_confirm_${pKey}`).setLabel(done ? t('battleship.setup.btn_ready') : t('battleship.setup.btn_place')).setStyle(done ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(!done && (!p.pending.col || !p.pending.line || !p.pending.orient)),
          new ButtonBuilder().setCustomId(`bn_random_${pKey}`).setLabel(t('battleship.setup.btn_random')).setStyle(ButtonStyle.Secondary).setDisabled(done)
        )
      ];
    };

    // --- MESSAGE PRINCIPAL ---
    const mainEmbed = () => new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(t('battleship.battle.title'))
      .setDescription(t('battleship.battle.main_desc', { 
        p1: player1, 
        s1: gameState.p1.ready ? '✅' : '⏳',
        p2: player2,
        s2: gameState.p2.ready ? '✅' : '⏳'
      }));

    const mainMessage = await message.reply({ 
      embeds: [mainEmbed()], 
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bn_start_setup').setLabel(t('battleship.setup.btn_start')).setStyle(ButtonStyle.Primary))] 
    });

    const collector = mainMessage.createMessageComponentCollector({ time: 1200000 });

    // --- FLEET STATUS ---
    const fleetStatus = (pKey) => gameState[pKey].ships.map(s => s.coords.every(c => c.hit) ? `~~${s.name}~~` : s.name).join(', ');

    // --- BATTLE UI : Tout sur le message principal ---
    const buildBattleEmbed = (pKey, extraInfo = '') => {
      const cur = gameState.turn;
      const opP = cur === 'p1' ? 'p2' : 'p1';
      return new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle(t('battleship.battle.title'))
        .setDescription(
          `${t('battleship.battle.turn_label')} : **${gameState[cur].user.username}**\n\n` +
          `**${t('battleship.battle.my_grid')} :**\n${renderBoard(gameState[pKey].board)}\n` +
          `**${t('battleship.battle.op_grid')} :**\n${renderBoard(gameState[opP].board, true)}\n` +
          (extraInfo ? `${extraInfo}\n` : '') +
          `📋 ${gameState.logs.slice(-2).join('\n📋 ')}`
        )
        .addFields(
          { name: `🚢 ${player1.username}`, value: fleetStatus('p1'), inline: true },
          { name: `🚢 ${player2.username}`, value: fleetStatus('p2'), inline: true }
        );
    };

    // Boutons lignes (étape 1)
    const buildRowButtons = () => [
      new ActionRowBuilder().addComponents(
        ...[1,2,3,4].map(n => new ButtonBuilder().setCustomId(`bn_row_${n-1}`).setLabel(`${n}`).setStyle(ButtonStyle.Primary))
      ),
      new ActionRowBuilder().addComponents(
        ...[5,6,7,8].map(n => new ButtonBuilder().setCustomId(`bn_row_${n-1}`).setLabel(`${n}`).setStyle(ButtonStyle.Primary))
      )
    ];

    // Boutons colonnes (étape 2)
    const buildColButtons = (selectedRow) => [
      new ActionRowBuilder().addComponents(
        ...'ABCD'.split('').map((l, i) => new ButtonBuilder().setCustomId(`bn_fire_${selectedRow}_${i}`).setLabel(l).setStyle(ButtonStyle.Danger))
      ),
      new ActionRowBuilder().addComponents(
        ...'EFGH'.split('').map((l, i) => new ButtonBuilder().setCustomId(`bn_fire_${selectedRow}_${i+4}`).setLabel(l).setStyle(ButtonStyle.Danger))
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bn_back_rows').setLabel(t('battleship.battle.btn_back')).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bn_view_self').setLabel(t('battleship.battle.btn_view_self')).setStyle(ButtonStyle.Secondary)
      )
    ];

    const showRowSelection = async (pKey, interaction = null) => {
      gameState.selectedRow = null;
      const embed = buildBattleEmbed(pKey || gameState.turn, t('battleship.battle.choose_row'));
      const components = buildRowButtons();
      if (interaction) await interaction.update({ embeds: [embed], components }).catch(() => {});
      else await mainMessage.edit({ embeds: [embed], components }).catch(() => {});
    };

    const showColSelection = async (pKey, row, interaction) => {
      gameState.selectedRow = row;
      const embed = buildBattleEmbed(pKey, t('battleship.battle.choose_col', { row: row + 1 }));
      const components = buildColButtons(row);
      await interaction.update({ embeds: [embed], components }).catch(() => {});
    };

    // --- LOGIQUE DE TIR ---
    const handleShot = async (pKey, r, c) => {
      const opKey = pKey === 'p1' ? 'p2' : 'p1';
      const cell = gameState[opKey].board[r][c];
      if (cell >= 2) return 'already';

      if (cell === 0) {
        gameState[opKey].board[r][c] = 2;
        gameState.logs.push(t('battleship.logs.miss', { user: gameState[pKey].user.username, coord: `${String.fromCharCode(65+c)}${r+1}` }));
      } else {
        gameState[opKey].board[r][c] = 3;
        const ship = gameState[opKey].ships.find(s => s.coords.some(co => co.r === r && co.c === c));
        ship.coords.find(co => co.r === r && co.c === c).hit = true;
        if (ship.coords.every(co => co.hit)) gameState.logs.push(t('battleship.logs.sunk', { user: gameState[pKey].user.username, ship: ship.name }));
        else gameState.logs.push(t('battleship.logs.hit', { user: gameState[pKey].user.username }));
      }

      if (gameState[opKey].ships.every(s => s.coords.every(co => co.hit))) {
        const winEmbed = new EmbedBuilder().setColor(0x2ECC71)
          .setTitle(t('battleship.battle.win_title'))
          .setDescription(
            t('battleship.battle.win_desc', { user: gameState[pKey].user.username, opponent: gameState[opKey].user.username }) +
            `\n${renderBoard(gameState[opKey].board)}`
          );
        await mainMessage.edit({ embeds: [winEmbed], components: [] });
        collector.stop();
        return 'win';
      }

      gameState.turn = opKey;
      return 'ok';
    };

    // --- TOUR DU BOT ---
    const botTurn = async () => {
      if (gameState.turn !== 'p2' || !isSolo) return;
      await new Promise(r => setTimeout(r, 1500));
      let br, bc;
      do { br = Math.floor(Math.random() * SIZE); bc = Math.floor(Math.random() * SIZE); } while (gameState.p1.board[br][bc] >= 2);
      const result = await handleShot('p2', br, bc);
      if (result !== 'win') await showRowSelection('p1');
    };

    // --- COLLECTOR PRINCIPAL ---
    collector.on('collect', async (i) => {
      const pKey = i.user.id === player1.id ? 'p1' : (i.user.id === player2.id ? 'p2' : null);

      // === SETUP ===
      if (i.customId === 'bn_start_setup') {
        if (!pKey) return i.reply({ content: t('battleship.not_playing'), ephemeral: true });
        if (gameState[pKey].ready) return i.reply({ content: t('battleship.already_ready'), ephemeral: true });

        const setupMsg = await i.reply({ embeds: [createSetupEmbed(pKey)], components: createSetupRows(pKey), ephemeral: true, fetchReply: true });
        const setupCollector = setupMsg.createMessageComponentCollector({ time: 600000 });

        setupCollector.on('collect', async (si) => {
          const p = gameState[pKey];
          const id = si.customId;

          if (id.includes('col')) p.pending.col = si.values[0];
          else if (id.includes('line')) p.pending.line = si.values[0];
          else if (id.includes('orient')) p.pending.orient = si.values[0];
          else if (id.includes('random')) {
            generateRandomBoard(pKey);
            p.currentShipIdx = SHIPS_CONFIG.length;
          }
          else if (id.includes('confirm')) {
            if (p.currentShipIdx < SHIPS_CONFIG.length) {
              const ship = SHIPS_CONFIG[p.currentShipIdx];
              const r = parseInt(p.pending.line) - 1;
              const c = p.pending.col.charCodeAt(0) - 65;
              const horiz = p.pending.orient === 'H';
              let can = true;
              for (let j = 0; j < ship.size; j++) {
                if (!isValid(r+(horiz?0:j), c+(horiz?j:0)) || p.board[r+(horiz?0:j)][c+(horiz?j:0)] !== 0) { can = false; break; }
              }
              if (!can) return si.reply({ content: t('battleship.invalid_placement'), ephemeral: true });
              const coords = [];
              for (let j = 0; j < ship.size; j++) {
                const nr = r+(horiz?0:j), nc = c+(horiz?j:0);
                p.board[nr][nc] = 1;
                coords.push({ r: nr, c: nc, hit: false });
              }
              p.ships.push({ name: ship.name, coords });
              p.currentShipIdx++;
              p.pending = { col: null, line: null, orient: null };
            } else {
              p.ready = true;
              setupCollector.stop();
              await si.update({ content: t('battleship.already_ready'), embeds: [], components: [] });
              if (gameState.p1.ready && gameState.p2.ready) {
                gameState.phase = 'battle';
                await showRowSelection('p1');
              } else {
                await mainMessage.edit({ embeds: [mainEmbed()] });
              }
              return;
            }
          }
          await si.update({ embeds: [createSetupEmbed(pKey)], components: createSetupRows(pKey) }).catch(() => {});
        });
        return;
      }

      // === BATAILLE ===
      if (gameState.phase !== 'battle') return;
      if (!pKey) return i.reply({ content: t('battleship.not_playing'), ephemeral: true });

      // Vue défensive (seul message éphémère restant)
      if (i.customId === 'bn_view_self') {
        return i.reply({ content: `**${t('battleship.battle.my_grid')} :**\n${renderBoard(gameState[pKey].board)}`, ephemeral: true });
      }

      // Retour aux lignes
      if (i.customId === 'bn_back_rows') {
        return showRowSelection(pKey, i);
      }

      // Clic sur une LIGNE
      if (i.customId.startsWith('bn_row_')) {
        if (pKey !== gameState.turn) return i.reply({ content: t('battleship.not_your_turn'), ephemeral: true });
        const row = parseInt(i.customId.split('_')[2]);
        return showColSelection(pKey, row, i);
      }

      // Clic sur une COLONNE → TIR !
      if (i.customId.startsWith('bn_fire_')) {
        if (pKey !== gameState.turn) return i.reply({ content: t('battleship.not_your_turn'), ephemeral: true });
        const parts = i.customId.split('_');
        const row = parseInt(parts[2]);
        const col = parseInt(parts[3]);

        const result = await handleShot(pKey, row, col);

        if (result === 'already') {
          return showRowSelection(pKey, i);
        }

        if (result === 'win') return;

        // Affiche le résultat puis passe au tour suivant
        await showRowSelection(pKey, i);

        // Tour du bot
        if (isSolo && gameState.turn === 'p2') await botTurn();
      }
    });
  }
};
