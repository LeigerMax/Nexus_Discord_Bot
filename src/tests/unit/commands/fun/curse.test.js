/**
 * @file Tests unitaires pour la commande curse
 */

const curseCommand = require('../../../../commands/fun/curse.js');
const { createMockContext } = require('../../../testUtils');

// Mock setInterval to avoid leaks
global.setInterval = jest.fn().mockReturnValue(12345);
global.clearInterval = jest.fn();

describe('Commande: curse', () => {
  let mockMessage;
  let mockContext;
  let mockMember;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMember = {
        id: 'user-456',
        user: { 
            id: 'user-456',
            username: 'TestUser',
            bot: false,
            displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
        },
        voice: { channel: null, setMute: jest.fn() }
    };

    mockMessage = {
      author: {
        id: 'author-123',
        username: 'Author',
        send: jest.fn().mockResolvedValue({})
      },
      mentions: {
        members: { first: jest.fn(() => mockMember) },
        users: new Map([['user-456', mockMember.user]])
      },
      guild: {
        id: 'guild-789',
        name: 'Test Guild',
        channels: { cache: new Map() },
        members: { fetch: jest.fn().mockResolvedValue(mockMember) }
      },
      reply: jest.fn().mockResolvedValue({}),
      channel: { send: jest.fn().mockResolvedValue({}) },
      delete: jest.fn().mockResolvedValue({})
    };

    mockContext = createMockContext({
      t: (key) => key
    });
  });

  test('devrait afficher la liste des types avec "types"', async () => {
    await curseCommand.execute(mockMessage, ['types'], mockContext);
    expect(mockMessage.author.send).toHaveBeenCalled();
  });

  test('devrait refuser si pas de mention', async () => {
    mockMessage.mentions.members.first.mockReturnValue(null);
    await curseCommand.execute(mockMessage, ['30'], mockContext);
    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('curse.mention_error')
    }));
  });

  test('devrait maudire un joueur si tout est valide', async () => {
    await curseCommand.execute(mockMessage, ['30'], mockContext);
    expect(mockMessage.reply).toHaveBeenCalled();
  });
});
