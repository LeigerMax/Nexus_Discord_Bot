/**
 * Tests unitaires pour l'événement guildMemberAdd
 * Teste le message de bienvenue des nouveaux membres
 */

const storageService = require('../../../services/storageService');
const guildMemberAddEvent = require('../../../events/guildMemberAdd.js');
const { getRandomWelcomeMessage } = require('../../../commands/admin/welcome.js');

jest.mock('../../../services/storageService');

jest.mock('../../../services/statsService');
jest.mock('../../../commands/admin/welcome.js', () => ({
  getRandomWelcomeMessage: jest.fn()
}));


describe('Event: guildMemberAdd', () => {
  let mockMember;
  let mockChannel;
  let mockGuild;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.WELCOME_CHANNEL_ID = 'channel-123';

    mockChannel = {
      id: 'channel-123',
      send: jest.fn().mockResolvedValue({})
    };

    mockGuild = {
      id: 'guild-123',
      name: 'Test Server',
      memberCount: 10,
      channels: {
        cache: new Map([['channel-123', mockChannel]])
      }
    };

    mockMember = {
      id: 'user-456',
      user: {
        id: 'user-456',
        username: 'NewUser',
        tag: 'NewUser#1234'
      },
      guild: mockGuild,
      client: { 
          commands: new Map() 
      }
    };

    storageService.get.mockReturnValue({});
    getRandomWelcomeMessage.mockReturnValue('Bienvenue !');
    
    // Client and commands setup
    if (!mockMember.client.commands) {
        mockMember.client.commands = new Map();
    }
  });

  test('doit envoyer un message de bienvenue via .env si dashboard non configuré', async () => {
    await guildMemberAddEvent.execute(mockMember);
    expect(mockChannel.send).toHaveBeenCalled();
  });

  test('doit gérer les erreurs gracieusement', async () => {
    mockChannel.send.mockRejectedValue(new Error('Cannot send'));
    await expect(guildMemberAddEvent.execute(mockMember)).resolves.not.toThrow();
  });
});
