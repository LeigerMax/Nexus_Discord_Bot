/**
 * @file Tests unitaires pour utils/commandHandler.js
 * Teste le gestionnaire de commandes
 */

const storageService = require('../../../services/storageService');
const i18n = require('../../../services/i18nService');

// Mock de fs et path
jest.mock('node:fs', () => ({
  readdirSync: jest.fn().mockReturnValue([]),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{}'),
  mkdirSync: jest.fn()
}));
jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));
jest.mock('../../../services/storageService');
jest.mock('../../../services/i18nService');

const CommandHandler = require('../../../utils/commandHandler.js');

describe('Utils: CommandHandler', () => {
  let commandHandler;
  let mockClient;
  let mockMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Silence expected logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

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
        members: { first: jest.fn() },
        users: new Map()
      },
      channel: {
        id: 'channel-123',
        send: jest.fn().mockResolvedValue({})
      },
      guild: {
        id: 'guild-123'
      },
      reply: jest.fn().mockResolvedValue({})
    };

    storageService.get.mockReturnValue({ prefix: '!', language: 'fr' });
    i18n.t.mockImplementation((key) => key);

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
  });

  describe('Levenshtein', () => {
    test('doit calculer la distance correctement', () => {
        expect(commandHandler.levenshteinDistance('test', 'test')).toBe(0);
        expect(commandHandler.levenshteinDistance('test', 'tost')).toBe(1);
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

    test('doit exécuter une commande valide avec le bon contexte', async () => {
      const command = commandHandler.commands.get('test');
      await commandHandler.handleMessage(mockMessage);
      
      expect(command.execute).toHaveBeenCalledWith(
        mockMessage, 
        ['arg1', 'arg2'],
        expect.objectContaining({
            prefix: '!',
            locale: 'fr'
        })
      );
    });

    test('doit suggérer des commandes similaires si introuvable', async () => {
      mockMessage.content = '!tst arg1';
      
      await commandHandler.handleMessage(mockMessage);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.any(String)
        })
      );
    });
  });
});
