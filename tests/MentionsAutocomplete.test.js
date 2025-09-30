import MentionsAutocomplete from '../src/MentionsAutocomplete';

// Mock dependencies
jest.mock('../src/cd', () => ({
  s: jest.fn((key) => `mocked-${key}`),
  config: {
    mentionCharacter: '@',
  },
  mws: jest.fn((key) => ' '),
  g: {
    userNamespacesRegexp: /^User:(.+)$/,
    contribsPages: ['Special:Contributions'],
  },
  getApi: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('../src/userRegistry', () => ({
  get: jest.fn((name) => ({
    getNamespaceAlias: () => 'User',
    isRegistered: () => true,
  })),
}));

jest.mock('../src/BaseAutocomplete');

describe('MentionsAutocomplete', () => {
  let mentionsAutocomplete;

  beforeEach(() => {
    mentionsAutocomplete = new MentionsAutocomplete();
  });

  describe('getLabel', () => {
    it('should return the mentions label', () => {
      expect(mentionsAutocomplete.getLabel()).toBe('mocked-cf-autocomplete-mentions-label');
    });
  });

  describe('getTrigger', () => {
    it('should return the mention character', () => {
      expect(mentionsAutocomplete.getTrigger()).toBe('@');
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      expect(mentionsAutocomplete.validateInput('testuser')).toBe(true);
    });

    it('should reject empty input', () => {
      expect(mentionsAutocomplete.validateInput('')).toBe(false);
    });

    it('should reject input with forbidden characters', () => {
      expect(mentionsAutocomplete.validateInput('test#user')).toBe(false);
      expect(mentionsAutocomplete.validateInput('test<user')).toBe(false);
      expect(mentionsAutocomplete.validateInput('test[user')).toBe(false);
    });

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(86);
      expect(mentionsAutocomplete.validateInput(longInput)).toBe(false);
    });

    it('should reject input with too many spaces', () => {
      const inputWithManySpaces = 'a b c d e f';  // 6 spaces
      expect(mentionsAutocomplete.validateInput(inputWithManySpaces)).toBe(false);
    });
  });

  describe('transformItemToInsertData', () => {
    it('should transform registered user correctly', () => {
      const result = mentionsAutocomplete.transformItemToInsertData('TestUser');

      expect(result.start).toBe('@[[User:TestUser|');
      expect(result.end).toBe(']]');
      expect(result.content).toBe('TestUser');
    });

    it('should handle user names with special characters', () => {
      const result = mentionsAutocomplete.transformItemToInsertData('Test(User)');

      expect(result.start).toBe('@[[User:Test(User)|');
      expect(result.end).toBe('Test(User)]]');
      expect(result.content).toBe('Test(User)');
    });
  });
});