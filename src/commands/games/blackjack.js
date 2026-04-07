const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Lance une partie de Blackjack (Solo ou Multi contre le croupier)',
  usage: '!blackjack [@joueurs]',
  
  async execute(message, _args, context) {
    const { t } = context;
    const mentions = message.mentions.users;
    const playerUsers = [message.author];
    mentions.forEach(user => {
      if (user.id !== message.author.id && !user.bot) playerUsers.push(user);
    });

    // Données du jeu
    const deck = [];
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ value, suit });
      }
    }

    // Mélange (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const drawCard = () => deck.pop();

    const calculateScore = (hand) => {
      let score = 0;
      let aces = 0;
      for (const card of hand) {
        if (card.value === 'A') {
          aces++;
          score += 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
          score += 10;
        } else {
          score += parseInt(card.value);
        }
      }
      while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
      }
      return score;
    };

    // Initialisation des mains
    const dealerHand = [drawCard(), drawCard()];
    const players = playerUsers.map(user => ({
      user,
      hand: [drawCard(), drawCard()],
      status: 'playing', // 'playing', 'stand', 'bust', 'blackjack'
      score: 0
    }));

    players.forEach(p => {
      p.score = calculateScore(p.hand);
      if (p.score === 21) p.status = 'blackjack';
    });

    let currentPlayerIdx = players.findIndex(p => p.status === 'playing');
    let isDealerTurn = currentPlayerIdx === -1;
    let isGameOver = false;

    const formatHand = (hand, hideFirst = false) => {
      return hand.map((c, i) => (hideFirst && i === 0) ? '❓' : `[${c.value}${c.suit}]`).join(' ');
    };

    const createEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor(0x2F3136)
        .setTitle(t('blackjack.title'))
        .setTimestamp();

      let dealerDesc = `${t('blackjack.score_label')}: **${isDealerTurn || isGameOver ? calculateScore(dealerHand) : '?'}**\n${t('blackjack.cards_label')}: ${formatHand(dealerHand, !isDealerTurn && !isGameOver)}`;
      embed.addFields({ name: `🤵 ${t('blackjack.dealer_label')}`, value: dealerDesc });

      players.forEach((p, i) => {
        let statusEmoji = '';
        if (p.status === 'bust') statusEmoji = t('blackjack.status_bust');
        else if (p.status === 'blackjack') statusEmoji = t('blackjack.status_blackjack');
        else if (p.status === 'stand') statusEmoji = t('blackjack.status_stand');
        else if (i === currentPlayerIdx) statusEmoji = t('blackjack.status_turn');

        const value = `${t('blackjack.score_label')}: **${p.score}** ${statusEmoji}\n${t('blackjack.cards_label')}: ${formatHand(p.hand)}`;
        embed.addFields({ name: `👤 ${p.user.username}`, value: value, inline: true });
      });

      if (isGameOver) {
        let resultsList = '';
        const dealerScore = calculateScore(dealerHand);
        players.forEach(p => {
          let res = '';
          if (p.status === 'bust') res = t('blackjack.res_lose_bust');
          else if (p.score === 21 && p.hand.length === 2) {
             if (dealerScore === 21 && dealerHand.length === 2) res = t('blackjack.res_blackjack_push');
             else res = t('blackjack.res_blackjack_win');
          }
          else if (dealerScore > 21) res = t('blackjack.res_win_dealer_bust');
          else if (p.score > dealerScore) res = t('blackjack.res_win');
          else if (p.score < dealerScore) res = t('blackjack.res_lose');
          else res = t('blackjack.res_push');
          resultsList += `**${p.user.username}** : ${res}\n`;
        });
        embed.setDescription(`**${t('blackjack.results_title')}**\n${resultsList}`);
      } else {
        const turnUser = players[currentPlayerIdx]?.user || t('blackjack.dealer_label');
        embed.setDescription(isDealerTurn ? t('blackjack.dealer_turn_desc') : t('blackjack.player_turn_desc', { user: turnUser.username }));
      }

      return embed;
    };

    const createRows = () => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('bj_hit')
          .setLabel(t('blackjack.btn_hit'))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(isDealerTurn || isGameOver),
        new ButtonBuilder()
          .setCustomId('bj_stand')
          .setLabel(t('blackjack.btn_stand'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isDealerTurn || isGameOver)
      );
      return [row];
    };

    const gameMessage = await message.reply({
      embeds: [createEmbed()],
      components: createRows()
    });

    const collector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });

    const nextTurn = async () => {
      currentPlayerIdx++;
      while (currentPlayerIdx < players.length && players[currentPlayerIdx].status !== 'playing') {
        currentPlayerIdx++;
      }

      if (currentPlayerIdx >= players.length) {
        isDealerTurn = true;
        await gameMessage.edit({ embeds: [createEmbed()], components: createRows() });
        await dealerPlay();
      } else {
        await gameMessage.edit({ embeds: [createEmbed()], components: createRows() });
      }
    };

    const dealerPlay = async () => {
      // Le croupier joue si au moins un joueur n'est pas "bust"
      const anyPlayerAlive = players.some(p => p.status !== 'bust');
      
      if (anyPlayerAlive) {
        while (calculateScore(dealerHand) < 17) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          dealerHand.push(drawCard());
          await gameMessage.edit({ embeds: [createEmbed()], components: createRows() });
        }
      }

      isGameOver = true;
      collector.stop();
      await gameMessage.edit({ embeds: [createEmbed()], components: [] });
    };

    collector.on('collect', async (i) => {
      const p = players[currentPlayerIdx];
      if (!p || i.user.id !== p.user.id) {
        const turnUser = players[currentPlayerIdx]?.user;
        return i.reply({ content: t('blackjack.not_your_turn', { user: turnUser.id }), ephemeral: true });
      }

      if (i.customId === 'bj_hit') {
        p.hand.push(drawCard());
        p.score = calculateScore(p.hand);
        if (p.score > 21) {
          p.status = 'bust';
          await i.update({ embeds: [createEmbed()], components: createRows() });
          await nextTurn();
        } else if (p.score === 21) {
          p.status = 'stand'; // On s'arrête automatiquement à 21
          await i.update({ embeds: [createEmbed()], components: createRows() });
          await nextTurn();
        } else {
          await i.update({ embeds: [createEmbed()], components: createRows() });
        }
      } else if (i.customId === 'bj_stand') {
        p.status = 'stand';
        await i.update({ embeds: [createEmbed()], components: createRows() });
        await nextTurn();
      }
    });

    // Si tout le monde a déjà un Blackjack (rare !)
    if (isDealerTurn) await dealerPlay();
  }
};
