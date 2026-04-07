/**
 * Tests unitaires pour la commande welcome (admin)
 */

const welcomeCommand = require('../../../../commands/admin/welcome');
const { createMockContext } = require('../../../testUtils');

describe('Welcome Command', () => {
  let mockInteraction;
  let mockContext;

  beforeEach(() => {
    mockInteraction = {
      options: {
        getSubcommand: jest.fn(() => 'test'),
      },
      member: {
        id: 'user-456',
        toString: () => '<@user-456>',
      },
      user: { id: '123456789', toString: () => '<@123456789>' },
      isChatInputCommand: jest.fn(() => true),
      reply: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = createMockContext({
      t: (key) => {
        if (key === 'welcome.messages') {
          return ['Bienvenue {user} !', 'Hello {user} !', 'Salut {user} !'];
        }
        return key;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // TESTS STRUCTURELS
  // ========================================

  test('devrait avoir les propriétés requises', () => {
    expect(welcomeCommand).toHaveProperty('data');
    expect(welcomeCommand).toHaveProperty('execute');
  });

  test('devrait avoir un SlashCommandBuilder configuré', () => {
    expect(welcomeCommand.data.name).toBe('welcome');
    expect(welcomeCommand.data.description).toBeDefined();
  });

  // ========================================
  // TESTS FONCTIONNELS
  // ========================================

  test('devrait exécuter le subcommand "test"', async () => {
    await welcomeCommand.execute(mockInteraction, [], mockContext);

    expect(mockInteraction.options.getSubcommand).toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.any(String),
        ephemeral: true,
      })
    );
  });

  test('devrait retourner un message contenant le nom d\'utilisateur', async () => {
    await welcomeCommand.execute(mockInteraction, [], mockContext);

    const replyCall = mockInteraction.reply.mock.calls[0][0];
    expect(replyCall.content).toContain('<@123456789>');
  });

  // ========================================
  // TESTS DE LA FONCTION getRandomWelcomeMessage
  // ========================================

  test('getRandomWelcomeMessage devrait retourner un message', async () => {
    // Importe la fonction exportée (si elle l'est) ou appelle la commande
    await welcomeCommand.execute(mockInteraction, [], mockContext);
    
    const replyCall = mockInteraction.reply.mock.calls[0][0];
    expect(replyCall.content).toBeDefined();
    expect(typeof replyCall.content).toBe('string');
    expect(replyCall.content.length).toBeGreaterThan(0);
  });

  test('getRandomWelcomeMessage devrait contenir la mention du membre', async () => {
    await welcomeCommand.execute(mockInteraction, [], mockContext);
    
    const replyCall = mockInteraction.reply.mock.calls[0][0];
    // Vérifie que le message contient la mention de l'utilisateur
    expect(replyCall.content).toContain('<@123456789>');
  });

  test('getRandomWelcomeMessage devrait retourner différents messages', async () => {
    const messages = new Set();
    
    // Teste 20 fois pour avoir une bonne probabilité de messages différents
    for (let i = 0; i < 20; i++) {
      const mockInt = {
        user: { username: 'TestUser', toString: () => '<@123456789>' },
        isChatInputCommand: jest.fn(() => true),
        options: { getSubcommand: jest.fn(() => 'test') },
        reply: jest.fn().mockResolvedValue(undefined),
      };
      
      await welcomeCommand.execute(mockInt, [], mockContext);
      const replyCall = mockInt.reply.mock.calls[0][0];
      messages.add(replyCall.content);
    }
    
    // Avec 10 messages possibles, on devrait en avoir au moins 3 différents sur 20 essais
    expect(messages.size).toBeGreaterThan(2);
  });

  // ========================================
  // TESTS DE GESTION D'ERREUR
  // ========================================

  test('devrait gérer les erreurs lors de l\'exécution', async () => {
    mockInteraction.reply = jest.fn().mockRejectedValue(new Error('Interaction failed'));

    await expect(welcomeCommand.execute(mockInteraction, [], mockContext)).rejects.toThrow();
  });
});
