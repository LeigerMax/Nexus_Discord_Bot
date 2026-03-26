/**
 * @file Discord Bot Main Entry Point
 * @description Initialise le client Discord, gère les commandes et les événements
 * @module bot
 * @requires dotenv
 * @requires discord.js
 * @author Maxou
 * @version 0.1.5
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('node:path');
const CommandHandler = require('./utils/commandHandler');
const keepAlive = require('./services/keepAlive');

// ============================================
// Initialisation du client Discord
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
    // Intents Privilégiés désactivés temporairement pour réduire le risque de 429 sur Render :
    // GatewayIntentBits.GuildMembers,
    // GatewayIntentBits.GuildPresences,
  ],
  partials: ['CHANNEL'],
  // Force IPv4 pour éviter les hangs DNS sur certains serveurs (Node 18+)
  rest: {
    family: 4
  }
});

// ============================================
// Initialisation du gestionnaire de commandes
// ============================================

const commandHandler = new CommandHandler(client, '!');
// Note: Le middleware de malédiction est désactivé le temps de stabiliser la connexion
// const curseMiddleware = require('./middlewares/curseMiddleware');
// commandHandler.addMiddleware(curseMiddleware);
client.commandHandler = commandHandler;

// ============================================
// Événement: Bot prêt
// ============================================

client.once('ready', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Bot connecté en tant que ${client.user.tag}`);
  console.log(`Date: ${new Date().toLocaleString('fr-FR')}`);
  console.log(`Serveurs: ${client.guilds.cache.size}`);
  console.log(`${'='.repeat(50)}\n`);

  // Configure la présence du bot
  const botConfig = require('./config/botConfig.json');
  const { ActivityType } = require('discord.js');

  try {
    const { status, activities } = botConfig.presence;
    const activityTypeMap = {
      'PLAYING': ActivityType.Playing,
      'WATCHING': ActivityType.Watching,
      'LISTENING': ActivityType.Listening,
      'STREAMING': ActivityType.Streaming,
      'COMPETING': ActivityType.Competing
    };

    client.user.setPresence({
      status: status || 'online',
      activities: activities.map(activity => ({
        name: activity.name,
        type: activityTypeMap[activity.type] || ActivityType.Playing
      }))
    });
    console.log(`✅ Présence du bot définie: ${status} - ${activities[0]?.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de la définition de la présence:', error);
  }

  // Charge toutes les commandes
  const commandsPath = path.join(__dirname, 'commands');
  commandHandler.loadCommands(commandsPath);

  // Charge les événements
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = require('node:fs').readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  console.log('\nChargement des événements...');
  for (const file of eventFiles) {
    // On ignore temporairement presenceUpdate.js car l'intent est désactivé
    if (file === 'presenceUpdate.js') continue;

    const filePath = path.join(eventsPath, file);
    try {
      const eventHandler = require(filePath);
      if (typeof eventHandler === 'function') {
        eventHandler(client);
        console.log(`✅ Événement chargé: ${file}`);
      } else if (eventHandler.name && typeof eventHandler.execute === 'function') {
        if (eventHandler.once) {
          client.once(eventHandler.name, (...args) => eventHandler.execute(...args));
        } else {
          client.on(eventHandler.name, (...args) => eventHandler.execute(...args));
        }
        console.log(`✅ Événement chargé: ${file} (${eventHandler.name})`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de l'événement ${file}:`, error);
    }
  }

  console.log('\n✅ Bot prêt à recevoir des commandes!\n');
});

// ============================================
// Gestion des messages et événements
// ============================================

client.on('messageCreate', async (message) => {
  await commandHandler.handleMessage(message);
});

// ============================================
// Gestion des erreurs
// ============================================

client.on('error', error => {
  console.error('Erreur Discord.js:', error);
});

process.on('unhandledRejection', error => {
  console.error('Promesse non gérée:', error);
});

// ============================================
// Connexion et démarrage
// ============================================

const start = async () => {
  console.log("🚀 Lancement du bot...");
  
  // 1. Lance le serveur web immédiatement
  keepAlive();

  // 2. Connexion Discord
  console.log("⏳ Tentative de connexion à Discord...");
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log("✅ Connexion réussie!");
  } catch (error) {
    console.error('❌ Erreur fatale de connexion Discord:', error.message);
    if (error.message.includes('429')) {
      console.error("⚠️ Tu es rate-limited par Discord. Attends 15-30 minutes avant de redéployer.");
    }
    process.exit(1);
  }
};

start();
