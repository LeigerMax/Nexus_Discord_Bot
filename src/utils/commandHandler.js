/**
 * @file Command Handler Utility
 * @description Gestionnaire de commandes qui charge automatiquement toutes les commandes et gère leur exécution avec un système de middleware
 * @module utils/commandHandler
 * @requires node:fs
 * @requires node:path
 */

const fs = require('node:fs');
const path = require('node:path');
const storageService = require('../services/storageService');

class CommandHandler {
  constructor(client, prefix) {
    this.client = client;
    this.prefix = prefix;
    this.commands = new Map();
    this.middlewares = [];
  }

  /**
   * Ajoute un middleware à la chaine d'exécution
   * @param {Function} middleware - Fonction asynchrone prenant (context, next)
   */
  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Charge toutes les commandes depuis le dossier commands
   * @param {string} commandsPath - Chemin vers le dossier commands
   */
  loadCommands(commandsPath) {
    const categories = fs.readdirSync(commandsPath);

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);
      
      // Vérifie que c'est un dossier
      if (!fs.statSync(categoryPath).isDirectory()) continue;

      const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        
        try {
          const command = require(filePath);
          
          if ('name' in command && 'execute' in command) {
            this.commands.set(command.name, command);
            console.log(`Commande chargée: ${command.name} (${category})`);
          } else {
            console.warn(`${file} ne contient pas de propriétés 'name' ou 'execute'`);
          }
        } catch (error) {
          console.error(`Erreur lors du chargement de ${file}:`, error);
        }
      }
    }

    console.log(`\nTotal: ${this.commands.size} commande(s) chargée(s)\n`);
  }

  /**
   * Trouve les commandes similaires basées sur la distance de Levenshtein
   * @param {string} input - La commande entrée par l'utilisateur
   * @returns {Array<string>} - Liste des commandes similaires triées par pertinence
   */
  findSimilarCommands(input) {
    const commandNames = Array.from(this.commands.keys());
    const suggestions = [];

    for (const cmdName of commandNames) {
      const distance = this.levenshteinDistance(input, cmdName);
      
      if (distance <= 3 || cmdName.startsWith(input) || input.startsWith(cmdName)) {
        suggestions.push({ name: cmdName, distance });
      }
    }

    suggestions.sort((a, b) => a.distance - b.distance);
    return suggestions.map(s => s.name);
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   * @param {string} a - Première chaîne
   * @param {string} b - Deuxième chaîne
   * @returns {number} - Distance de Levenshtein
   */
  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // suppression
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Exécute la chaine de middlewares et la commande finale
   * @param {Object} context - Le contexte de la commande
   */
  async executeMiddlewares(context) {
    let index = -1;
    
    const runner = async (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      
      // Si on a passé tous les middlewares, on exécute la vraie commande
      if (i === this.middlewares.length) {
        return await context.command.execute(context.message, context.args, context);
      }
      
      const middleware = this.middlewares[i];
      await middleware(context, () => runner(i + 1));
    };
    
    await runner(0);
  }

  /**
   * Traite un message et exécute la commande si elle existe
   * @param {Object} message - Le message Discord
   */
  async handleMessage(message) {
    if (message.author.bot) return;

    // Récupère la configuration du serveur (préfixe et langue)
    let prefix = this.prefix;
    let locale = 'fr';
    if (message.guild) {
      const config = storageService.get(message.guild.id);
      if (config) {
        if (config.prefix) prefix = config.prefix;
        if (config.language) locale = config.language;
      }
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = this.commands.get(commandName);
    
    if (!command) {
      const suggestions = this.findSimilarCommands(commandName);
      if (suggestions.length > 0) {
        const i18n = require('../services/i18nService');
        const suggestionsList = suggestions.slice(0, 5).map(cmd => `\`${prefix}${cmd}\``).join(', ');
        return message.reply({
          content: `❌ ${i18n.t('common.error_find_command', locale, { command: commandName })}\n💡 **Suggestions**: ${suggestionsList}\n\n${i18n.t('common.help_suggestion', locale, { prefix })}`,
          allowedMentions: { repliedUser: false }
        });
      }
      return; 
    }

    const i18n = require('../services/i18nService');
    const context = {
      message,
      args,
      command,
      commandName,
      client: this.client,
      commands: this.commands,
      prefix: prefix,
      locale: locale,
      t: (key, params) => i18n.t(key, locale, params)
    };

    try {
      await this.executeMiddlewares(context);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      try {
        await message.reply({
          content: 'Une erreur est survenue lors de l\'exécution de cette commande.'
        });
      } catch (replyError) {
        console.error('Impossible d\'envoyer le message d\'erreur:', replyError);
      }
    }
  }
}

module.exports = CommandHandler;
