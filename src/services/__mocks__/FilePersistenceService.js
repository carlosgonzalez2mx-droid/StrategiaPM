/**
 * Mock de FilePersistenceService para tests
 */

const mockFilePersistenceService = {
  initialize: jest.fn().mockResolvedValue(true),
  loadData: jest.fn().mockResolvedValue(null),
  saveData: jest.fn().mockResolvedValue(true),
  createBackup: jest.fn().mockResolvedValue(true),
  restoreBackup: jest.fn().mockResolvedValue(true),
  startAutoSync: jest.fn(),
  stopAutoSync: jest.fn(),
  clearData: jest.fn().mockResolvedValue(true),
};

export default mockFilePersistenceService;
