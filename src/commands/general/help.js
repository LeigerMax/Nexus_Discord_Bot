/**
 * @file Help Command
 * @description Affiche toutes les commandes disponibles organisées par catégorie avec menu de sélection interactif
 * @module commands/general/help
 * @category General
 * @requires discord.js
 * @requires node:fs
 * @requires node:path
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  name: 'help',
  description: 'Affiche toutes les commandes disponibles avec menu de sélection',
  usage: '!help',
  
  async execute(message, _args) {
    try {
      const commandsPath = path.join(__dirname, '..');
      const categories = fs.readdirSync(commandsPath).filter(item => {
        const itemPath = path.join(commandsPath, item);
        return fs.statSync(itemPath).isDirectory();
      });

      // Emojis pour chaque catégorie
      const categoryEmojis = {
        'admin': '⚙️',
        'fun': '🎮',
        'general': '📋',
        'music': '🎵',
        'moderation': '🛡️',
        'utility': '🔧',
        'games': '🎮'
      };

      // Noms pour les catégories
      const categoryNames = {
        'admin': 'Administration',
        'fun': 'Divertissement',
        'general': 'Général',
        'music': 'Musique',
        'moderation': 'Modération',
        'utility': 'Utilitaire',
        'games': 'Jeux'
      };

      // Collecte les commandes par catégorie
      const commandsByCategory = {};
      let totalCommands = 0;

      for (const category of categories.toSorted((a, b) => a.localeCompare(b))) {
        const categoryPath = path.join(commandsPath, category);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        if (commandFiles.length === 0) continue;

        commandsByCategory[category] = [];
        
        for (const file of commandFiles) {
          const filePath = path.join(categoryPath, file);
          
          try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('name' in command && 'execute' in command) {
              commandsByCategory[category].push(command);
              totalCommands++;
            }
          } catch (error) {
            console.error(`Erreur lors du chargement de ${file}:`, error);
          }
        }
      }

      // Crée l'embed d'accueil
      const homeEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📚 Menu d\'Aide')
        .setDescription(
          `Bienvenue dans le menu d'aide!\n\n` +
          `**Total**: ${totalCommands} commande(s)\n` +
          `**Préfixe**: \`!\`\n\n` +
          `Utilisez le menu déroulant ci-dessous pour naviguer entre les catégories.`
        )
        .setFooter({ text: `Demandé par ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      // Ajoute un aperçu des catégories
      for (const category in commandsByCategory) {
        const emoji = categoryEmojis[category] || '📌';
        const categoryName = categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
        const commandCount = commandsByCategory[category].length;
        homeEmbed.addFields({
          name: `${emoji} ${categoryName}`,
          value: `${commandCount} commande(s)`,
          inline: true
        });
      }

      // Crée le menu déroulant
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('Sélectionnez une catégorie...');

      // Ajoute l'option "Accueil"
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('🏠 Accueil')
          .setDescription('Retour au menu principal')
          .setValue('home')
      );

      // Ajoute les options pour chaque catégorie
      for (const category in commandsByCategory) {
        const emoji = categoryEmojis[category] || '📌';
        const categoryName = categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
        const commandCount = commandsByCategory[category].length;
        
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${emoji} ${categoryName}`)
            .setDescription(`${commandCount} commande(s) disponible(s)`)
            .setValue(category)
        );
      }

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await message.reply({
        embeds: [homeEmbed],
        components: [row]
      });

      // Collecteur d'interactions
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (interaction) => {
        const selectedValue = interaction.values[0];

        if (selectedValue === 'home') {
          await interaction.update({
            embeds: [homeEmbed],
            components: [row]
          });
          return;
        }

        // Crée l'embed pour la catégorie sélectionnée
        const category = selectedValue;
        const emoji = categoryEmojis[category] || '📌';
        const categoryName = categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
        const commands = commandsByCategory[category];

        const categoryEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`${emoji} ${categoryName}`)
          .setDescription(`Liste des commandes de la catégorie **${categoryName}** :`)
          .setFooter({ text: `${commands.length} commande(s) • Demandé par ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();

        // Ajoute les commandes
        const commandsList = commands.map(cmd => {
          const description = cmd.description || 'Pas de description';
          const usage = cmd.usage || `!${cmd.name}`;
          return `**!${cmd.name}**\n${description}\n\`${usage}\``;
        }).join('\n\n');

        // Divise en plusieurs embeds si nécessaire
        if (commandsList.length > 4096) {
          // Si trop long, utilise le format compact
          const compactList = commands.map(cmd => {
            const description = cmd.description || 'Pas de description';
            return `\`!${cmd.name}\` • ${description}`;
          }).join('\n');
          
          categoryEmbed.setDescription(
            `Liste des commandes de la catégorie **${categoryName}** :\n\n${compactList}`
          );
        } else {
          categoryEmbed.setDescription(
            `Liste des commandes de la catégorie **${categoryName}** :\n\n${commandsList}`
          );
        }

        await interaction.update({
          embeds: [categoryEmbed],
          components: [row]
        });
      });

      collector.on('end', () => {
        // Désactive le menu après expiration
        selectMenu.setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
        response.edit({ components: [disabledRow] }).catch(() => {});
      });

    } catch (error) {
      console.error('Erreur dans la commande info:', error);
      message.reply('❌ Une erreur est survenue lors de la récupération des commandes.');
    }
  },
};
