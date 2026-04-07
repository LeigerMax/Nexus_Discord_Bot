/**
 * @file Tests unitaires pour l'événement voiceStateUpdate
 */

// 1. Set ENV before requiring modules
process.env.ACTIVITY_SALON_ID = 'activity-789';
process.env.LOOSER_ID = 'looser-123';

const storageService = require('../../../services/storageService');
jest.mock('../../../services/storageService');

const voiceStateUpdateModule = require('../../../events/voiceStateUpdate.js');

describe('Event: voiceStateUpdate', () => {
  let mockClient;
  let voiceStateUpdateHandler;
  let mockOldState;
  let mockNewState;
  let mockChannel;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      send: jest.fn().mockResolvedValue({})
    };

    mockNewState = {
      member: {
        id: 'looser-123',
        user: { 
            username: 'Miguel',
            displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
        }
      },
      channel: {
        id: 'voice-1',
        name: 'Général',
        members: { size: 0 }
      },
      guild: {
        id: 'guild-1',
        channels: {
          cache: new Map([['activity-789', mockChannel]])
        }
      }
    };

    mockOldState = {
      member: mockNewState.member,
      channel: null,
      guild: mockNewState.guild
    };

    mockClient = {
      on: jest.fn((event, handler) => {
        if (event === 'voiceStateUpdate') {
          voiceStateUpdateHandler = handler;
        }
      })
    };

    storageService.get.mockReturnValue({});
    voiceStateUpdateModule(mockClient);
  });

  test('doit traiter les changements de statut vocal du looser', async () => {
    await voiceStateUpdateHandler(mockOldState, mockNewState);
    expect(mockChannel.send).toHaveBeenCalled();
  });
});
