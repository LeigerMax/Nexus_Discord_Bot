/**
 * @file Guild Member Add Event
 * @description Accueille un nouveau membre avec un message personnalisé après vérification anti-raid
 * @module events/guildMemberAdd
 * @listens guildMemberAdd
 * @requires discord.js
 */

const { Events } = require('discord.js');
const storageService = require('../services/storageService');
const auditService = require('../services/auditService');
const statsService = require('../services/statsService');
const { getRandomWelcomeMessage } = require('../commands/admin/welcome.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guildId = member.guild.id;
        const config = storageService.get(guildId);

        // 1. Vérifie l'anti-raid en premier
        try {
            const antiRaidCommand = member.client.commands?.get('antiraid');
            if (antiRaidCommand && antiRaidCommand.checkRaid) {
                await antiRaidCommand.checkRaid(member.guild, member);
                
                const antiRaidConfig = antiRaidCommand.getConfig(guildId);
                if (antiRaidConfig && antiRaidConfig.locked) {
                    return; // Le membre a été retiré par l'anti-raid
                }
            }
        } catch (error) {
            console.error('Erreur anti-raid:', error);
        }

        // 2. Gestion du message de bienvenue (Dashboard Priority)
        const welcomeConfig = config?.welcome;
        
        if (!welcomeConfig || !welcomeConfig.enabled || !welcomeConfig.channelId) {
            // Si le dashboard n'est pas configuré, on peut essayer le fallback .env si nécessaire
            // Mais la consigne est de privilégier le Dashboard.
            if (!process.env.WELCOME_CHANNEL_ID) return;
            
            // Logique de repli (ancienne méthode)
            const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
            if (channel) {
                const welcomeMessage = getRandomWelcomeMessage(member);
                await channel.send(welcomeMessage).catch(console.error);
            }
            return;
        }

        const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
        if (!channel) return;

        // Remplacement des variables dans le message personnalisé
        let messageText = welcomeConfig.message || 'Bienvenue {user} !';
        messageText = messageText
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{count}/g, member.guild.memberCount);

        try {
            await channel.send(messageText);
            
            // Log Audit (v1.0.0)
            await auditService.logJoin(member);

            // MAJ Stats (v1.1.0)
            await statsService.updateStats(member.guild);
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message de bienvenue personnalisé:', error);
        }
    },
};
