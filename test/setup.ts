// test/setup.ts
import 'reflect-metadata';

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Set up any global test configuration
  // For example, you might want to set up a test database connection
  // or initialize other services that need to be available across all tests
});

afterAll(async () => {
  // Clean up any global resources
  // Close database connections, clear caches, etc.
  await new Promise(resolve => setTimeout(resolve, 500)); // Allow async operations to complete
});

// Mock console methods to reduce noise in test output
// You can comment this out if you want to see console output during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for debugging failed tests
};

// Global test utilities
global.testUtils = {
  // Add any utility functions you want available in all tests
  mockDate: (date: string | Date) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  },
  
  restoreTime: () => {
    jest.useRealTimers();
  },
  
  // Helper to create mock UUIDs for consistent testing
  createMockId: (suffix = '001') => `650e8400-e29b-41d4-a716-4466554400${suffix}`,
};

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // You can add custom matchers here if needed
    }
  }
  
  var testUtils: {
    mockDate: (date: string | Date) => void;
    restoreTime: () => void;
    createMockId: (suffix?: string) => string;
  };
}

// Clean up after each test
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Restore real timers if they were mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
});