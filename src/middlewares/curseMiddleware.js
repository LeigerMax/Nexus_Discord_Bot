/**
 * @file Curse Middleware
 * @description Intercepte l'exécution des commandes pour les joueurs maudits
 * @module middlewares/curseMiddleware
 */

module.exports = async (context, next) => {
  const { message, commandName, commands, t } = context;
  
  const curseCommand = commands.get('curse');
  if (!curseCommand?.isCursed(message.author.id)) {
    return await next();
  }

  const curseType = curseCommand.getCurseType(message.author.id);
  
  // Malédiction: Ignoré
  if (curseType === 'IGNORED') {
    return; // Ignore complètement le message sans exécuter next()
  }
  
  // Malédiction: Bloqué
  if (curseType === 'BLOCKED') {
    return message.reply(t('middlewares.curse.blocked'));
  }

  // Malédiction: Épreuve du Scribe (Bloque les commandes pour forcer le recopiage de la phrase)
  if (curseType === 'CHALLENGE') {
    const curseData = curseCommand.cursedPlayers.get(message.author.id);
    return message.reply(t('middlewares.curse.challenge', { phrase: curseData.challengePhrase }));
  }
  
  // Malédiction: Réponses aléatoires
  if (curseType === 'RANDOM_RESPONSES') {
    return message.reply(curseCommand.getRandomResponse());
  }
  
  // Malédiction: Messages déformés (inverse la commande)
  if (curseType === 'GARBLED') {
    const garbledMsg = message.content.split('').reverse().join('');
    return message.reply(t('middlewares.curse.garbled', { msg: garbledMsg }));
  }
  
  // Malédiction: Mode lent
  if (curseType === 'SLOW_MODE') {
    message.reply(t('middlewares.curse.slow'));
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 secondes
  }
  
  // Malédiction: Commandes inversées
  if (curseType === 'REVERSED') {
    if (message.mentions.users.size > 0) {
      const reversibleCommands = ['curse', 'mute', 'spam', 'slap', 'hug', 'kiss'];
      if (reversibleCommands.includes(commandName)) {
        // Remplace la première mention par celle du joueur
        context.args = context.args.slice();
        context.args[0] = `<@${message.author.id}>`;
        
        message.channel.send(t('middlewares.curse.reversed_target', { user: `<@${message.author.id}>` }));
        
        try {
          await next(); // Proceed to actual command execution
        } catch (error) {
          console.error(`Erreur lors de l'exécution inversée de ${commandName}:`, error);
          message.reply(t('middlewares.curse.reversed_failed'));
        }
        return;
      }
    }
    return message.reply(t('middlewares.curse.reversed_general', { cmd: commandName }));
  }

  // Pre-execution finie pour les autres malédictions
  await next();

  // Post-Execution logic (ex: WORST_LUCK)
  if (curseType === 'WORST_LUCK') {
    const randomCommands = ['dice', 'roll', 'coin', 'random', 'roulette'];
    if (randomCommands.includes(commandName)) {
      setTimeout(() => {
        message.channel.send(t('middlewares.curse.worst_luck', { user: `<@${message.author.id}>` }));
      }, 500);
    }
  }
};
