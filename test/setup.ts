import 'reflect-metadata';


process.env.NODE_ENV = 'test';

beforeAll(async () => {

});

afterAll(async () => {

  await new Promise(resolve => setTimeout(resolve, 500)); 
});


const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, 
};


global.testUtils = {

  mockDate: (date: string | Date) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  },
  
  restoreTime: () => {
    jest.useRealTimers();
  },
  

  createMockId: (suffix = '001') => `650e8400-e29b-41d4-a716-4466554400${suffix}`,
};


declare global {
  namespace jest {
    interface Matchers<R> {
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