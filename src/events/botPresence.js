/**
 * @file Bot Presence Event
 * @description Configure la présence du bot (status et activité affichée) au démarrage
 * @module events/botPresence
 * @listens clientReady
 * @requires discord.js
 */

const { ActivityType } = require('discord.js');
const botConfig = require('../config/botConfig.json');

/**
 * Convertit un type d'activité en chaîne vers l'enum ActivityType
 * @param {string} type - Type d'activité ("PLAYING", "WATCHING", "LISTENING", "STREAMING", "COMPETING")
 * @returns {ActivityType} - Type d'activité Discord.js
 */
function getActivityType(type) {
  const typeMap = {
    'PLAYING': ActivityType.Playing,
    'WATCHING': ActivityType.Watching,
    'LISTENING': ActivityType.Listening,
    'STREAMING': ActivityType.Streaming,
    'COMPETING': ActivityType.Competing
  };
  return typeMap[type] || ActivityType.Playing;
}

/**
 * Définit la présence du bot
 * @param {Client} client - Client Discord.js
 */
function setBotPresence(client) {
  if (!client?.user) {
    console.error('❌ Client ou user non disponible pour définir la présence');
    return;
  }

  try {
    const { status, activities } = botConfig.presence;

    // Configure la présence du bot
    const presenceData = {
      status: status || 'online',
      activities: activities.map(activity => ({
        name: activity.name,
        type: getActivityType(activity.type)
      }))
    };

    client.user.setPresence(presenceData);
    console.log(`✅ Présence du bot définie: ${status} - ${activities[0]?.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de la définition de la présence du bot:', error);
  }
}

/**
 * Initialise l'événement de présence
 * @param {Client} client - Client Discord.js
 */
module.exports = function(client) {
  client.once('ready', () => {
    setBotPresence(client);
  });
};

// Export pour les tests
module.exports.setBotPresence = setBotPresence;
module.exports.getActivityType = getActivityType;
