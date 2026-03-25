/**
 * Tests unitaires pour l'événement botPresence
 */

const { ActivityType } = require('discord.js');
const botPresence = require('../../../../src/events/botPresence');

describe('botPresence Event', () => {
  let mockClient;

  beforeEach(() => {
    // Mock client avec user
    mockClient = {
      user: {
        setPresence: jest.fn()
      },
      once: jest.fn((event, callback) => {
        if (event === 'ready') {
          callback();
        }
      })
    };
  });

  describe('getActivityType', () => {
    it('devrait retourner ActivityType.Playing pour PLAYING', () => {
      const result = botPresence.getActivityType('PLAYING');
      expect(result).toBe(ActivityType.Playing);
    });

    it('devrait retourner ActivityType.Watching pour WATCHING', () => {
      const result = botPresence.getActivityType('WATCHING');
      expect(result).toBe(ActivityType.Watching);
    });

    it('devrait retourner ActivityType.Listening pour LISTENING', () => {
      const result = botPresence.getActivityType('LISTENING');
      expect(result).toBe(ActivityType.Listening);
    });

    it('devrait retourner ActivityType.Streaming pour STREAMING', () => {
      const result = botPresence.getActivityType('STREAMING');
      expect(result).toBe(ActivityType.Streaming);
    });

    it('devrait retourner ActivityType.Competing pour COMPETING', () => {
      const result = botPresence.getActivityType('COMPETING');
      expect(result).toBe(ActivityType.Competing);
    });

    it('devrait retourner ActivityType.Playing par défaut pour un type inconnu', () => {
      const result = botPresence.getActivityType('UNKNOWN');
      expect(result).toBe(ActivityType.Playing);
    });
  });

  describe('setBotPresence', () => {
    it('devrait définir la présence du bot avec succès', () => {
      botPresence.setBotPresence(mockClient);

      expect(mockClient.user.setPresence).toHaveBeenCalledTimes(1);
      const callArgs = mockClient.user.setPresence.mock.calls[0][0];
      
      expect(callArgs).toHaveProperty('status');
      expect(callArgs).toHaveProperty('activities');
      expect(Array.isArray(callArgs.activities)).toBe(true);
    });

    it('devrait définir le status "online" par défaut', () => {
      botPresence.setBotPresence(mockClient);

      const callArgs = mockClient.user.setPresence.mock.calls[0][0];
      expect(callArgs.status).toBe('online');
    });

    it('devrait définir au moins une activité', () => {
      botPresence.setBotPresence(mockClient);

      const callArgs = mockClient.user.setPresence.mock.calls[0][0];
      expect(callArgs.activities.length).toBeGreaterThan(0);
      expect(callArgs.activities[0]).toHaveProperty('name');
      expect(callArgs.activities[0]).toHaveProperty('type');
    });

    it('ne devrait pas planter si le client est null', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => botPresence.setBotPresence(null)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('ne devrait pas planter si client.user est undefined', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidClient = {};
      
      expect(() => botPresence.setBotPresence(invalidClient)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('devrait gérer les erreurs lors de setPresence', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.user.setPresence = jest.fn(() => {
        throw new Error('Erreur de test');
      });

      expect(() => botPresence.setBotPresence(mockClient)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lors de la définition de la présence du bot'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Module initialization', () => {
    it('devrait s\'initialiser correctement avec le client', () => {
      const moduleInit = require('../../../../src/events/botPresence');
      
      expect(() => moduleInit(mockClient)).not.toThrow();
      expect(mockClient.once).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('devrait appeler setBotPresence lors de l\'événement ready', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const moduleInit = require('../../../../src/events/botPresence');
      
      moduleInit(mockClient);

      // Vérifie que la présence a été définie (via les logs)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Présence du bot définie')
      );
      
      consoleSpy.mockRestore();
    });
  });
});
