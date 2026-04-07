/**
 * @file Tests unitaires pour la commande auto (admin)
 */

const autoCommand = require('../../../../commands/admin/auto');
const { createMockContext } = require('../../../testUtils');

// Mock global pour éviter les fuites de timers
global.setInterval = jest.fn().mockReturnValue(123);
global.clearInterval = jest.fn();

describe('Auto Command', () => {
  let mockMessage;
  let mockMember;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMember = {
      permissions: {
        has: jest.fn(() => true),
      },
    };

    mockMessage = {
      author: { username: 'AdminUser', id: '123456789' },
      member: mockMember,
      channel: { id: 'channel123', send: jest.fn().mockResolvedValue({}) },
      guild: { id: 'guild123' },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = createMockContext({
      t: (key) => key
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('devrait avoir les propriétés requises', () => {
    expect(autoCommand).toHaveProperty('name');
  });

  test('devrait refuser si pas administrateur', async () => {
    mockMember.permissions.has = jest.fn(() => false);

    await autoCommand.execute(mockMessage, ['60', 'test'], mockContext);

    expect(mockMessage.reply).toHaveBeenCalled();
  });

  test('devrait démarrer un interval si tout est valide', async () => {
    await autoCommand.execute(mockMessage, ['60', 'Mon message'], mockContext);

    expect(global.setInterval).toHaveBeenCalled();
    expect(mockMessage.reply).toHaveBeenCalled();
  });

  test('devrait arrêter un interval avec "stop"', async () => {
      // On mock stopInterval pour simuler qu'il y en a un
      jest.spyOn(autoCommand, 'stopInterval').mockReturnValue(true);
      
      await autoCommand.execute(mockMessage, ['stop'], mockContext);
      expect(autoCommand.stopInterval).toHaveBeenCalled();
      autoCommand.stopInterval.mockRestore();
  });
});
