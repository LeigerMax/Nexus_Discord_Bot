/**
 * @file Keep Alive & Dashboard Service
 * @description Serveur web Express pour le Dashboard et le maintien en vie du bot
 * @module services/keepAlive
 */

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('node:path');
const fs = require('node:fs');
const storageService = require('./storageService');
const YoutubeService = require('./youtubeService');
const helmet = require('helmet');
const csrf = require('csurf');
const app = express();

/**
 * Configure le serveur web pour le Dashboard
 * @param {Object} client - Le client Discord
 */
function keepAlive(client) {
  const PORT = process.env.PORT || 10000;
  const updateService = require('./updateService');
  const { PermissionsBitField } = require('discord.js');

  // Middleware
  // Middleware de sécurité
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        "img-src": ["'self'", "https://cdn.discordapp.com", "data:"],
        "connect-src": ["'self'", "https://discord.com"]
      },
    },
  }));

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-nexus-bot',
    resave: false,
    saveUninitialized: false,
    name: '__nexus_session', // Nom de cookie personnalisé
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    }
  }));

  // CSRF Protection
  const csrfProtection = csrf();
  // On ne l'applique qu'aux routes qui en ont besoin ou on gère l'exception pour le callback OAuth
  app.use((req, res, next) => {
    // Le callback OAuth2 vient de Discord, il ne peut pas avoir de token CSRF
    if (req.path === '/auth/callback' || req.path === '/login') {
      return next();
    }
    csrfProtection(req, res, next);
  });

  // --- Routes d'authentification ---

  app.get('/login', (req, res) => {
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId || !process.env.DISCORD_REDIRECT_URI) {
      return res.status(500).send("Configuration OAuth2 manquante (.env)");
    }
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
  });

  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');

    try {
      const params = new URLSearchParams();
      params.append('client_id', process.env.DISCORD_CLIENT_ID);
      params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', process.env.DISCORD_REDIRECT_URI);

      const response = await axios.post('https://discord.com/api/oauth2/token', params);
      const { access_token } = response.data;

      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      req.session.user = userResponse.data;
      req.session.guilds = guildsResponse.data;

      res.redirect('/dashboard.html');
    } catch (error) {
      console.error("❌ Erreur OAuth2:", error.response?.data || error.message);
      res.status(500).send("Erreur lors de l'authentification.");
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // Fournit le token CSRF au frontend
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // --- Routes API ---

  // Liste les serveurs où l'utilisateur est admin et le bot est présent
  app.get('/api/guilds', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });

    const managedGuilds = req.session.guilds.filter(g => {
      // Vérifie si l'utilisateur a la permission MANAGE_GUILD (0x20)
      const isAdmin = (BigInt(g.permissions) & PermissionsBitField.Flags.ManageGuild) === PermissionsBitField.Flags.ManageGuild;
      return isAdmin && client.guilds.cache.has(g.id);
    });

    res.json(managedGuilds);
  });

  // Récupère la config d'un serveur
  app.get('/api/config/:guildId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    const { guildId } = req.params;

    // Vérification de sécurité
    const userGuild = req.session.guilds.find(g => g.id === guildId);
    if (!userGuild || !(BigInt(userGuild.permissions) & PermissionsBitField.Flags.ManageGuild)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const config = storageService.get(guildId) || {
      prefix: '!',
      loosers: [],
      kings: [],
      weeklyRotation: false,
      lastRotation: null,
      welcome: { enabled: false, channelId: null, message: 'Bienvenue {user} !' },
      antiraid: { enabled: false, joinLimit: 5, joinWindow: 10, action: 'kick', autoLock: true },
      monitoring: { enabled: false, targetIds: [], channelId: null },
      curseSettings: { disabledTypes: [], defaultDuration: 300 },
      rouletteMuteDuration: 300,
      audit: { enabled: false, channelId: null },
      youtube: { enabled: false, channels: [] },
      stats: { enabled: false, totalChannelId: null, onlineChannelId: null },
      tempChannels: { enabled: false, hubChannelId: null, categoryId: null },
      tickets: { enabled: false, categoryId: null, staffRoleIds: [] },
      features: { autoFeur: true },
      language: 'fr'
    };

    // Enrichir avec les membres du serveur pour faciliter la sélection
    try {
      const guild = await client.guilds.fetch(guildId);
      const members = await guild.members.fetch();
      const channels = guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      }));

      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone' && !r.managed)
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor
        }));

      const memberList = members.filter(m => !m.user.bot).map(m => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName
      }));

      res.json({ config, members: memberList, channels, roles });
    } catch {
      res.status(500).json({ error: 'Impossible de récupérer les membres du serveur' });
    }
  });

  // API : Liste des messages automatiques actifs pour un serveur
  app.get('/api/auto-messages/:guildId', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    const guildId = req.params.guildId;

    try {
      const autoCommand = client.commands.get('auto');
      if (!autoCommand || !autoCommand.getIntervals) {
        return res.json([]);
      }

      const intervals = autoCommand.getIntervals().filter(i => i.guildId === guildId);
      res.json(intervals);
    } catch {
      res.status(500).json({ error: 'Erreur lors de la récupération des automates' });
    }
  });

  // API : Arrêter un message automatique
  app.post('/api/auto-messages/stop', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    const { channelId } = req.body;

    try {
      const autoCommand = client.commands.get('auto');
      if (autoCommand && autoCommand.stopInterval) {
        autoCommand.stopInterval(channelId);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Commande auto indisponible' });
      }
    } catch {
      res.status(500).json({ error: 'Erreur lors de l\'arrêt de l\'automate' });
    }
  });

  // API : Résolution d'ID YouTube depuis URL/Handle
  app.post('/api/youtube/resolve', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    const { url } = req.body;
    try {
      const channelId = await YoutubeService.resolveChannelId(url);
      if (channelId) {
        res.json({ success: true, channelId });
      } else {
        res.status(404).json({ error: 'ID non trouvé' });
      }
    } catch {
      res.status(500).json({ error: 'Erreur lors de la résolution' });
    }
  });

  // API : Obtenir le changelog complet
  app.get('/api/changelog', (req, res) => {
    const lang = req.query.lang || 'fr';
    const versionPath = path.join(__dirname, '../config/version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

      // Localise le changelog si possible
      if (lang === 'en' && versionData.changelog) {
        Object.keys(versionData.changelog).forEach(v => {
          const entry = versionData.changelog[v];
          if (entry.features_en) entry.features = entry.features_en;
          if (entry.fixes_en) entry.fixes = entry.fixes_en;
        });
      }

      res.json(versionData);
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  });

  // API : Informations sur les mises à jour (v1.1.0)
  app.get('/api/update', async (req, res) => {
    const latest = updateService.getLatestInfo();
    const current = require('../config/version.json').current;

    if (latest) {
      const isNew = updateService.isNewer(latest.tag_name.replace('v', ''), current);
      res.json({ isNew, latest: latest.tag_name, url: latest.html_url, name: latest.name });
    } else {
      res.json({ isNew: false });
    }
  });

  // Sauvegarde la config d'un serveur
  app.post('/api/config/:guildId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    const { guildId } = req.params;
    const newConfig = req.body;

    const userGuild = req.session.guilds.find(g => g.id === guildId);
    if (!userGuild || !(BigInt(userGuild.permissions) & PermissionsBitField.Flags.ManageGuild)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await storageService.set(guildId, newConfig);
    res.json({ success: true });
  });

  // Route par défaut
  app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard.html');
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Dashboard actif sur le port ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}\n`);
  });
}

module.exports = keepAlive;
module.exports.app = app;
