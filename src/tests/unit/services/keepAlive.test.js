/**
 * Tests unitaires pour le service keepAlive
 * Vérifie le bon fonctionnement du serveur Express
 */

// Mock express avant d'importer keepAlive
const mockApp = {
  get: jest.fn(),
  listen: jest.fn((port, host, callback) => {
    if (callback) callback();
    return { close: jest.fn() };
  })
};

jest.mock('express', () => {
  return jest.fn(() => mockApp);
});

const keepAlive = require('../../../services/keepAlive');

describe('KeepAlive Service', () => {
  
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // ========================================
  // TESTS STRUCTURELS
  // ========================================

  test('devrait exporter une fonction', () => {
    expect(typeof keepAlive).toBe('function');
  });

  test('devrait être définit et importable', () => {
    expect(keepAlive).toBeDefined();
    expect(keepAlive).toBeInstanceOf(Function);
  });

  test('devrait avoir le bon nom de fonction', () => {
    expect(keepAlive.name).toBe('keepAlive');
  });

  test('devrait exporter app séparément', () => {
    expect(keepAlive.app).toBeDefined();
    expect(keepAlive.app).toBe(mockApp);
  });

  // ========================================
  // TESTS FONCTIONNELS
  // ========================================

  test('devrait démarrer le serveur avec keepAlive()', () => {
    const originalEnv = process.env.PORT;
    delete process.env.PORT;

    keepAlive();

    expect(mockApp.listen).toHaveBeenCalledWith(
      10000,
      '0.0.0.0',
      expect.any(Function)
    );

    process.env.PORT = originalEnv;
  });

  test('devrait utiliser PORT depuis process.env', () => {
    process.env.PORT = '3000';

    keepAlive();

    expect(mockApp.listen).toHaveBeenCalledWith(
      '3000',
      '0.0.0.0',
      expect.any(Function)
    );

    delete process.env.PORT;
  });

  test('devrait afficher un message console au démarrage', () => {
    delete process.env.PORT;
    
    keepAlive();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Serveur web actif')
    );
  });

});

