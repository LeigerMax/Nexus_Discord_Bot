/**
 * @file Discord Bot Main Entry Point
 * @description Initialise le client Discord, configure le système musical, charge les commandes et gère les événements
 * @module bot
 * @requires dotenv
 * @requires discord.js
 * @requires discord-player
 * @author Maxou
 * @version 0.1.4
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log("--- DEBUG ENV ---");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("TOKEN PRESENT:", process.env.DISCORD_TOKEN ? "OUI (longueur: " + process.env.DISCORD_TOKEN.length + ")" : "NON");
console.log("-----------------");

const { Client, GatewayIntentBits } = require('discord.js');
const path = require('node:path');
const CommandHandler = require('./utils/commandHandler');
const keepAlive = require('./services/keepAlive');
const https = require('node:https'); // Pour le test de connectivité

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

/**
 * Test de connectivité à l'API Discord avant le login
 */
async function checkDiscordConnectivity() {
  return new Promise((resolve) => {
    console.log("🔍 Test de connectivité à l'API Discord...");
    const req = https.get('https://discord.com/api/v10/gateway', (res) => {
      console.log(`📡 Réponse de l'API: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });

    req.on('error', (err) => {
      console.error("❌ Erreur de connectivité réseau:", err.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.error("❌ Timeout: Impossible de joindre Discord après 5s");
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  // 1. Lance le serveur keep-alive
  keepAlive();

  // 2. Test de connectivité
  const isConnected = await checkDiscordConnectivity();
  if (!isConnected) {
    console.warn("⚠️ Attention: L'API Discord semble injoignable. Tentative de login quand même...");
  }

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

    await client.login(token);
    console.log("✅ client.login() a réussi!");
  } catch (error) {
    console.error('❌ Erreur fatale de connexion Discord:', error.message);
    if (error.code) console.error(`Code d'erreur: ${error.code}`);
    process.exit(1);
  }
}

console.log("🚀 Lancement du bot en mode parallèle...");
start();