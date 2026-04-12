/**
 * @file Discord Bot Main Entry Point
 * @description Initialise le client Discord, configure le système musical, charge les commandes et gère les événements
 * @module bot
 * @requires dotenv
 * @requires discord.js
 * @requires discord-player
 * @author Maxou
 * @version 1.0.0
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Force IPv4 en premi猫re position pour Node 18+ (Correction des hangs DNS sur Render/Docker)
// Force IPv4 en première position pour Node 18+ (Correction des hangs DNS sur Render/Docker)
const dns = require('node:dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}


const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('node:path');
const CommandHandler = require('./utils/commandHandler');
const YoutubeService = require('./services/youtubeService');
const keepAlive = require('./services/keepAlive');
const storageService = require('./services/storageService');
const statsService = require('./services/statsService');
const updateService = require('./services/updateService');
// ============================================
// Initialisation du client Discord
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  // Force IPv4 pour les requêtes REST (complémentaire à dns.setDefaultResultOrder)
  rest: {
    family: 4
  }
});

// ============================================
// Initialisation du gestionnaire de commandes
// ============================================

const commandHandler = new CommandHandler(client, '!');
const curseMiddleware = require('./middlewares/curseMiddleware');
commandHandler.addMiddleware(curseMiddleware);
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

  // Initialisation du service de stockage
  await storageService.init(client, process.env.STORAGE_CHANNEL_ID);

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
    const filePath = path.join(eventsPath, file);
    try {
      const eventHandler = require(filePath);
      if (typeof eventHandler === 'function') {
        eventHandler(client);
        console.log(`✅ Événement chargé: ${file}`);
      } else if (eventHandler.name && typeof eventHandler.execute === 'function') {
        // Format Discord.js standard
        if (eventHandler.once) {
          client.once(eventHandler.name, (...args) => eventHandler.execute(...args));
        } else {
          client.on(eventHandler.name, (...args) => eventHandler.execute(...args));
        }
        console.log(`✅ Événement chargé: ${file} (${eventHandler.name})`);
      } else if (typeof eventHandler.init === 'function') {
        eventHandler.init(client);
        console.log(`✅ Événement chargé: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de l'événement ${file}:`, error);
    }
  }

  // Initialise le service YouTube
  const youtubeService = new YoutubeService(client);
  youtubeService.start();

  // Initialise le service de statistiques (v1.1.0)
  statsService.initAutoUpdate(client);

  // Vérifie les mises à jour (v1.1.0)
  updateService.checkForUpdates(client);
  setInterval(() => updateService.checkForUpdates(client), 24 * 60 * 60 * 1000);

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


async function start() {
  // 1. Lance le serveur keep-alive avec le Dashboard
  keepAlive(client);


  // 3. Configuration des logs de debug
  client.on('debug', (info) => {
    if (info.includes('heartbeat') || info.includes('latency')) return; // Filtre les logs trop fréquents
    console.log(`[DEBUG] ${info}`);
  });

  client.on('warn', info => console.warn(`[WARN] ${info}`));

  // 4. Connexion
  console.log("⏳ Tentative de connexion à Discord...");
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error("DISCORD_TOKEN manquant");

    console.log("⏳ Appel à client.login()...");
    await client.login(token);
    console.log("✅ client.login() a réussi!");
  } catch (error) {
    console.error('❌ Erreur fatale de connexion Discord:', error.message);
    if (error.code === 'DisallowedIntents') {
        console.error('❌ ERREUR: Vous devez activer les Privileged Gateway Intents dans le Portail Développeur Discord.');
    }
    if (error.code) console.error(`Code d'erreur: ${error.code}`);
    process.exit(1);
  }
}

console.log("🚀 Lancement du bot en mode parallèle...");
start();