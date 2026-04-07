/**
 * @file Test utilities for Nexus Discord Bot
 */
/* global jest */

/**
 * Creates a standardized mock context or command execution
 * @param {Object} overrides - Properties to override in the default mock
 * @returns {Object} A mock context object
 */
function createMockContext(overrides = {}) {
  const defaultContext = {
    t: (key, params) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
    locale: 'fr',
    prefix: '!',
    client: {
      user: { username: 'NexusBot', id: 'bot-123' }
    },
    storageService: {
      get: jest.fn().mockReturnValue({})
    }
  };

  return { ...defaultContext, ...overrides };
}

/**
 * Simple mock for i18nService
 */
const mockI18n = {
  t: jest.fn((key, locale, params) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  }),
  getGuildLocale: jest.fn().mockReturnValue('fr')
};

module.exports = {
  createMockContext,
  mockI18n
};
