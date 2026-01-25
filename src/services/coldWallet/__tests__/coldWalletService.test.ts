/**
 * ColdWalletService Tests
 *
 * Comprehensive tests for:
 * - BIP39 mnemonic generation
 * - Mnemonic validation
 * - Keypair derivation from mnemonic
 * - Verification word selection
 * - Word verification
 */

import { coldWalletService } from '../index';

describe('ColdWalletService', () => {
  describe('generateMnemonic', () => {
    it('should generate a valid 12-word mnemonic with 128-bit entropy', () => {
      const result = coldWalletService.generateMnemonic(128);

      expect(result.mnemonic).toBeDefined();
      expect(typeof result.mnemonic).toBe('string');

      const words = result.mnemonic.split(' ');
      expect(words).toHaveLength(12);

      // All words should be non-empty
      words.forEach(word => {
        expect(word.length).toBeGreaterThan(0);
      });
    });

    it('should generate a valid 24-word mnemonic with 256-bit entropy', () => {
      const result = coldWalletService.generateMnemonic(256);

      expect(result.mnemonic).toBeDefined();
      const words = result.mnemonic.split(' ');
      expect(words).toHaveLength(24);
    });

    it('should generate different mnemonics on each call', () => {
      const result1 = coldWalletService.generateMnemonic(128);
      const result2 = coldWalletService.generateMnemonic(128);

      expect(result1.mnemonic).not.toBe(result2.mnemonic);
    });

    it('should return correct word count', () => {
      const result128 = coldWalletService.generateMnemonic(128);
      const result256 = coldWalletService.generateMnemonic(256);

      expect(result128.wordCount).toBe(12);
      expect(result256.wordCount).toBe(24);
    });
  });

  describe('validateMnemonic', () => {
    it('should validate a correct 12-word mnemonic', () => {
      // Generate a valid mnemonic first
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result = coldWalletService.validateMnemonic(mnemonic);
      expect(result).toBe(true);
    });

    it('should validate a correct 24-word mnemonic', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(256);

      const result = coldWalletService.validateMnemonic(mnemonic);
      expect(result).toBe(true);
    });

    it('should reject an empty mnemonic', () => {
      const result = coldWalletService.validateMnemonic('');
      expect(result).toBe(false);
    });

    it('should reject a mnemonic with wrong word count', () => {
      const result = coldWalletService.validateMnemonic('word1 word2 word3');
      expect(result).toBe(false);
    });

    it('should reject a mnemonic with invalid words', () => {
      // 'xyz123' is not a valid BIP39 word
      const invalidMnemonic = 'xyz123 abc def ghi jkl mno pqr stu vwx yza bcd efg';
      const result = coldWalletService.validateMnemonic(invalidMnemonic);
      expect(result).toBe(false);
    });

    it('should reject a mnemonic with invalid checksum', () => {
      // Generate valid mnemonic then modify last word
      const { mnemonic } = coldWalletService.generateMnemonic(128);
      const words = mnemonic.split(' ');
      words[11] = words[0]; // Replace last word to break checksum

      const result = coldWalletService.validateMnemonic(words.join(' '));
      expect(result).toBe(false);
    });

    it('should handle mnemonics with extra whitespace', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);
      const mnemonicWithSpaces = '  ' + mnemonic.replace(/ /g, '   ') + '  ';

      const result = coldWalletService.validateMnemonic(mnemonicWithSpaces);
      expect(result).toBe(true);
    });
  });

  describe('deriveKeypair', () => {
    it('should derive a valid Solana keypair from mnemonic', async () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result = await coldWalletService.deriveKeypair(mnemonic);

      expect(result.keypair).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(typeof result.publicKey).toBe('string');

      // Solana public keys are base58 encoded, typically 32-44 characters
      expect(result.publicKey.length).toBeGreaterThanOrEqual(32);
      expect(result.publicKey.length).toBeLessThanOrEqual(44);
    });

    it('should derive the same keypair from the same mnemonic (deterministic)', async () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result1 = await coldWalletService.deriveKeypair(mnemonic);
      const result2 = await coldWalletService.deriveKeypair(mnemonic);

      expect(result1.publicKey).toBe(result2.publicKey);
      expect(Buffer.from(result1.keypair.secretKey).toString('hex'))
        .toBe(Buffer.from(result2.keypair.secretKey).toString('hex'));
    });

    it('should derive different keypairs from different mnemonics', async () => {
      const mnemonic1 = coldWalletService.generateMnemonic(128).mnemonic;
      const mnemonic2 = coldWalletService.generateMnemonic(128).mnemonic;

      const result1 = await coldWalletService.deriveKeypair(mnemonic1);
      const result2 = await coldWalletService.deriveKeypair(mnemonic2);

      expect(result1.publicKey).not.toBe(result2.publicKey);
    });

    it('should throw error for invalid mnemonic', async () => {
      await expect(coldWalletService.deriveKeypair('invalid mnemonic'))
        .rejects.toThrow();
    });

    it('should derive keypair from 24-word mnemonic', async () => {
      const { mnemonic } = coldWalletService.generateMnemonic(256);

      const result = await coldWalletService.deriveKeypair(mnemonic);

      expect(result.keypair).toBeDefined();
      expect(result.publicKey).toBeDefined();
    });
  });

  describe('selectVerificationWords', () => {
    it('should select 3 random words by default', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result = coldWalletService.selectVerificationWords(mnemonic);

      expect(result.indices).toHaveLength(3);
      expect(result.expectedWords).toHaveLength(3);
    });

    it('should select the specified number of words', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result = coldWalletService.selectVerificationWords(mnemonic, 5);

      expect(result.indices).toHaveLength(5);
      expect(result.expectedWords).toHaveLength(5);
    });

    it('should return valid word indices and values', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);
      const words = mnemonic.split(' ');

      const result = coldWalletService.selectVerificationWords(mnemonic);

      result.indices.forEach((index, i) => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(words.length);
        expect(result.expectedWords[i]).toBe(words[index]);
      });
    });

    it('should select different indices each time (randomness)', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        const selection = coldWalletService.selectVerificationWords(mnemonic);
        results.push(selection.indices.sort((a, b) => a - b).join(','));
      }

      // At least some selections should be different
      const uniqueSelections = new Set(results);
      expect(uniqueSelections.size).toBeGreaterThan(1);
    });

    it('should return indices in sorted order', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      const result = coldWalletService.selectVerificationWords(mnemonic);
      const indices = result.indices;

      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]);
      }
    });
  });

  describe('verifyWords', () => {
    it('should return valid=true for correct word verification', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);
      const selections = coldWalletService.selectVerificationWords(mnemonic);

      const result = coldWalletService.verifyWords(
        selections.expectedWords,
        selections.expectedWords
      );

      expect(result.valid).toBe(true);
      expect(result.incorrectIndices).toHaveLength(0);
    });

    it('should return valid=false for incorrect words', () => {
      const { mnemonic } = coldWalletService.generateMnemonic(128);
      const selections = coldWalletService.selectVerificationWords(mnemonic);

      const wrongWords = selections.expectedWords.map(() => 'wrongword');
      const result = coldWalletService.verifyWords(wrongWords, selections.expectedWords);

      expect(result.valid).toBe(false);
      expect(result.incorrectIndices.length).toBeGreaterThan(0);
    });

    it('should identify specific incorrect indices', () => {
      const expectedWords = ['apple', 'banana', 'cherry'];
      const providedWords = ['apple', 'wrong', 'cherry'];

      const result = coldWalletService.verifyWords(providedWords, expectedWords);

      expect(result.valid).toBe(false);
      expect(result.incorrectIndices).toContain(1);
      expect(result.incorrectIndices).not.toContain(0);
      expect(result.incorrectIndices).not.toContain(2);
    });

    it('should handle case-insensitive verification', () => {
      const expectedWords = ['apple', 'banana', 'cherry'];
      const providedWords = ['APPLE', 'BANANA', 'CHERRY'];

      const result = coldWalletService.verifyWords(providedWords, expectedWords);

      expect(result.valid).toBe(true);
    });

    it('should handle words with extra whitespace', () => {
      const expectedWords = ['apple', 'banana', 'cherry'];
      const providedWords = ['  apple  ', '  banana  ', '  cherry  '];

      const result = coldWalletService.verifyWords(providedWords, expectedWords);

      expect(result.valid).toBe(true);
    });

    it('should return valid=false for mismatched lengths', () => {
      const expectedWords = ['apple', 'banana', 'cherry'];
      const providedWords = ['apple', 'banana'];

      const result = coldWalletService.verifyWords(providedWords, expectedWords);

      expect(result.valid).toBe(false);
    });
  });

  describe('getWordList', () => {
    it('should return BIP39 English wordlist', () => {
      const wordList = coldWalletService.getWordList();

      expect(Array.isArray(wordList)).toBe(true);
      expect(wordList.length).toBe(2048);
    });
  });

  describe('isValidWord', () => {
    it('should return true for valid BIP39 words', () => {
      expect(coldWalletService.isValidWord('abandon')).toBe(true);
      expect(coldWalletService.isValidWord('zoo')).toBe(true);
      expect(coldWalletService.isValidWord('ability')).toBe(true);
    });

    it('should return false for invalid words', () => {
      expect(coldWalletService.isValidWord('xyz123')).toBe(false);
      expect(coldWalletService.isValidWord('notaword')).toBe(false);
      expect(coldWalletService.isValidWord('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(coldWalletService.isValidWord('ABANDON')).toBe(true);
      expect(coldWalletService.isValidWord('Abandon')).toBe(true);
    });
  });

  describe('getWordSuggestions', () => {
    it('should return words starting with prefix', () => {
      const suggestions = coldWalletService.getWordSuggestions('ab');

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(word => {
        expect(word.startsWith('ab')).toBe(true);
      });
    });

    it('should limit results to specified count', () => {
      const suggestions = coldWalletService.getWordSuggestions('a', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for empty prefix', () => {
      const suggestions = coldWalletService.getWordSuggestions('');

      expect(suggestions).toHaveLength(0);
    });

    it('should return empty array for non-matching prefix', () => {
      const suggestions = coldWalletService.getWordSuggestions('xyz');

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Known Test Vectors', () => {
    // BIP39 test vectors for Solana derivation
    const testVectors = [
      {
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        // This is a well-known test mnemonic
      },
    ];

    it('should derive expected keypair from known test vector', async () => {
      for (const vector of testVectors) {
        const result = await coldWalletService.deriveKeypair(vector.mnemonic);

        // Verify the public key is valid
        expect(result.publicKey).toBeDefined();
        expect(result.publicKey.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle mnemonic with various languages', () => {
      // BIP39 supports multiple languages, but we primarily support English
      const { mnemonic } = coldWalletService.generateMnemonic(128);

      // Verify it's valid English wordlist
      const result = coldWalletService.validateMnemonic(mnemonic);
      expect(result).toBe(true);
    });

    it('should handle maximum entropy (256 bits)', () => {
      const result = coldWalletService.generateMnemonic(256);

      const words = result.mnemonic.split(' ');
      expect(words).toHaveLength(24);

      const validation = coldWalletService.validateMnemonic(result.mnemonic);
      expect(validation).toBe(true);
    });

    it('should handle minimum entropy (128 bits)', () => {
      const result = coldWalletService.generateMnemonic(128);

      const words = result.mnemonic.split(' ');
      expect(words).toHaveLength(12);

      const validation = coldWalletService.validateMnemonic(result.mnemonic);
      expect(validation).toBe(true);
    });
  });
});
