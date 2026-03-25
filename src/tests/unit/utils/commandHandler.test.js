/**
 * Tests unitaires pour utils/commandHandler.js
 * Teste le gestionnaire de commandes
 */

const fs = require('node:fs');
const path = require('node:path');

// Mock de fs et path
jest.mock('node:fs');
jest.mock('node:path');

const CommandHandler = require('../../../utils/commandHandler.js');

describe('Utils: CommandHandler', () => {
  let commandHandler;
  let mockClient;
  let mockMessage;

  beforeEach(() => {
    mockClient = {
      on: jest.fn()
    };

    mockMessage = {
      author: {
        id: 'user-123',
        username: 'TestUser',
        bot: false
      },
      content: '!test arg1 arg2',
      mentions: {
        users: new Map()
      },
      channel: {
        send: jest.fn().mockResolvedValue({})
      },
      reply: jest.fn().mockResolvedValue({})
    };

    commandHandler = new CommandHandler(mockClient, '!');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructeur', () => {
    test('doit initialiser avec client et prefix', () => {
      expect(commandHandler.client).toBe(mockClient);
      expect(commandHandler.prefix).toBe('!');
      expect(commandHandler.commands).toBeInstanceOf(Map);
    });

    test('doit créer une Map vide pour les commandes', () => {
      expect(commandHandler.commands.size).toBe(0);
    });
  });

  describe('loadCommands', () => {
    beforeEach(() => {
      // Mock structure de dossiers
      fs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath.includes('commands')) {
          return ['admin', 'fun', 'general'];
        }
        return ['ping.js', 'test.js'];
      });

      fs.statSync.mockReturnValue({
        isDirectory: () => true
      });

      path.join.mockImplementation((...args) => args.join('/'));

      // Mock des commandes
      jest.mock = jest.fn();
    });

    test('doit charger les commandes valides', () => {
      const mockCommand = {
        name: 'test',
        execute: jest.fn()
      };

      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock require pour retourner une commande
      const originalRequire = require;
      global.require = jest.fn((modulePath) => {
        if (modulePath.includes('test.js')) {
          return mockCommand;
        }
        return originalRequire(modulePath);
      });

      commandHandler.loadCommands('src/commands');

      global.require = originalRequire;
      
      expect(fs.readdirSync).toHaveBeenCalled();
    });

    test('doit ignorer les fichiers qui ne sont pas des dossiers', () => {
      fs.statSync.mockReturnValue({
        isDirectory: () => false
      });

      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      commandHandler.loadCommands('src/commands');
      
      spy.mockRestore();
    });

    test('doit gérer les erreurs de chargement', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Cannot read directory');
      });

      expect(() => commandHandler.loadCommands('invalid/path')).toThrow();
      
      errorSpy.mockRestore();
    });
  });

  describe('levenshteinDistance', () => {
    test('doit calculer la distance pour chaînes identiques', () => {
      const distance = commandHandler.levenshteinDistance('test', 'test');
      expect(distance).toBe(0);
    });

    test('doit calculer la distance pour chaînes différentes', () => {
      const distance = commandHandler.levenshteinDistance('test', 'best');
      expect(distance).toBe(1); // 1 substitution
    });

    test('doit calculer la distance pour insertion', () => {
      const distance = commandHandler.levenshteinDistance('test', 'tests');
      expect(distance).toBe(1);
    });

    test('doit calculer la distance pour suppression', () => {
      const distance = commandHandler.levenshteinDistance('tests', 'test');
      expect(distance).toBe(1);
    });

    test('doit calculer la distance pour chaînes complètement différentes', () => {
      const distance = commandHandler.levenshteinDistance('abc', 'xyz');
      expect(distance).toBe(3);
    });

    test('doit gérer les chaînes vides', () => {
      expect(commandHandler.levenshteinDistance('', 'test')).toBe(4);
      expect(commandHandler.levenshteinDistance('test', '')).toBe(4);
      expect(commandHandler.levenshteinDistance('', '')).toBe(0);
    });
  });

  describe('findSimilarCommands', () => {
    beforeEach(() => {
      commandHandler.commands.set('help', { name: 'help', execute: jest.fn() });
      commandHandler.commands.set('ping', { name: 'ping', execute: jest.fn() });
      commandHandler.commands.set('pong', { name: 'pong', execute: jest.fn() });
      commandHandler.commands.set('test', { name: 'test', execute: jest.fn() });
    });

    test('doit trouver des commandes similaires', () => {
      const suggestions = commandHandler.findSimilarCommands('pin');
      expect(suggestions).toContain('ping');
    });

    test('doit trouver des commandes avec distance <= 3', () => {
      const suggestions = commandHandler.findSimilarCommands('helpp');
      expect(suggestions).toContain('help');
    });

    test('doit trouver des commandes par préfixe', () => {
      const suggestions = commandHandler.findSimilarCommands('po');
      expect(suggestions).toContain('pong');
    });

    test('doit trier par pertinence', () => {
      const suggestions = commandHandler.findSimilarCommands('pin');
      // ping doit être avant pong car plus proche
      expect(suggestions[0]).toBe('ping');
    });

    test('doit retourner tableau vide si aucune commande similaire', () => {
      const suggestions = commandHandler.findSimilarCommands('qwertyuiop');
      expect(suggestions).toEqual([]);
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      commandHandler.commands.set('test', {
        name: 'test',
        execute: jest.fn().mockResolvedValue({})
      });
    });

    test('doit ignorer les messages de bots', async () => {
      mockMessage.author.bot = true;
      await commandHandler.handleMessage(mockMessage);
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    test('doit ignorer les messages sans prefix', async () => {
      mockMessage.content = 'hello world';
      await commandHandler.handleMessage(mockMessage);
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    test('doit exécuter une commande valide', async () => {
      const command = commandHandler.commands.get('test');
      await commandHandler.handleMessage(mockMessage);
      expect(command.execute).toHaveBeenCalledWith(mockMessage, ['arg1', 'arg2']);
    });

    test('doit parser correctement les arguments', async () => {
      mockMessage.content = '!test   arg1   arg2  arg3  ';
      const command = commandHandler.commands.get('test');
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(command.execute).toHaveBeenCalledWith(mockMessage, ['arg1', 'arg2', 'arg3']);
    });

    test('doit suggérer des commandes similaires si introuvable', async () => {
      mockMessage.content = '!tst arg1';
      commandHandler.commands.set('test', { name: 'test', execute: jest.fn() });
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Suggestions')
        })
      );
    });

    test('doit limiter les suggestions à 5', async () => {
      // Ajoute plus de 5 commandes similaires
      for (let i = 0; i < 10; i++) {
        commandHandler.commands.set(`test${i}`, { name: `test${i}`, execute: jest.fn() });
      }
      
      mockMessage.content = '!tes';
      await commandHandler.handleMessage(mockMessage);
      
      const replyCall = mockMessage.reply.mock.calls[0][0];
      const suggestionCount = (replyCall.content.match(/`!test/g) || []).length;
      expect(suggestionCount).toBeLessThanOrEqual(5);
    });

    test('doit gérer les erreurs d\'exécution', async () => {
      const command = commandHandler.commands.get('test');
      command.execute.mockRejectedValue(new Error('Command failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('erreur')
        })
      );
      
      consoleSpy.mockRestore();
    });

    test('doit gérer les commandes sans arguments', async () => {
      mockMessage.content = '!test';
      const command = commandHandler.commands.get('test');
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(command.execute).toHaveBeenCalledWith(mockMessage, []);
    });

    test('doit convertir le nom de commande en minuscule', async () => {
      mockMessage.content = '!TEST arg1';
      const command = commandHandler.commands.get('test');
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(command.execute).toHaveBeenCalled();
    });
  });

  describe('Intégration malédictions (avec curse command)', () => {
    beforeEach(() => {
      const mockCurseCommand = {
        name: 'curse',
        execute: jest.fn(),
        isCursed: jest.fn().mockReturnValue(false),
        getCurseType: jest.fn(),
        getRandomResponse: jest.fn().mockReturnValue('Réponse aléatoire')
      };
      
      commandHandler.commands.set('curse', mockCurseCommand);
      commandHandler.commands.set('test', {
        name: 'test',
        execute: jest.fn().mockResolvedValue({})
      });
      
      const curseMiddleware = require('../../../middlewares/curseMiddleware.js');
      commandHandler.addMiddleware(curseMiddleware);
    });

    test('doit exécuter normalement si pas maudit', async () => {
      const command = commandHandler.commands.get('test');
      await commandHandler.handleMessage(mockMessage);
      expect(command.execute).toHaveBeenCalled();
    });

    test('doit ignorer si malédiction IGNORED', async () => {
      const curseCommand = commandHandler.commands.get('curse');
      curseCommand.isCursed.mockReturnValue(true);
      curseCommand.getCurseType.mockReturnValue('IGNORED');
      
      const testCommand = commandHandler.commands.get('test');
      await commandHandler.handleMessage(mockMessage);
      
      expect(testCommand.execute).not.toHaveBeenCalled();
    });

    test('doit bloquer si malédiction BLOCKED', async () => {
      const curseCommand = commandHandler.commands.get('curse');
      curseCommand.isCursed.mockReturnValue(true);
      curseCommand.getCurseType.mockReturnValue('BLOCKED');
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('maudit')
      );
    });

    test('doit donner réponse aléatoire si RANDOM_RESPONSES', async () => {
      const curseCommand = commandHandler.commands.get('curse');
      curseCommand.isCursed.mockReturnValue(true);
      curseCommand.getCurseType.mockReturnValue('RANDOM_RESPONSES');
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(mockMessage.reply).toHaveBeenCalledWith('Réponse aléatoire');
    });
  });
});
