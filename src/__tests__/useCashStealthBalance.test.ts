/**
 * Tests — useCashStealthBalance (tâche 5.2)
 *
 * Couvre :
 * - Appel GET /api/stealth/cash/balance au montage
 * - Polling toutes les 30 secondes
 * - Exposition de mainBalance, stealthBalance, totalBalance, stealthPayments, isLoading, error
 * - Méthode refreshBalance() pour rafraîchissement immédiat
 *
 * Requirements : 5.1, 5.2, 5.3, 5.4, 5.5
 */

jest.useFakeTimers();

// --- Mocks ---

const mockApiGet = jest.fn();
jest.mock('../services/clientStealf', () => ({
  useAuthenticatedApi: () => ({ get: mockApiGet }),
}));

// Mock React hooks
let stateCallCount = 0;
const mockUseCallback = jest.fn((fn: any, _deps: any) => fn);
const mockUseEffect = jest.fn((fn: any, _deps: any) => fn());

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: any) => {
      stateCallCount++;
      return [initial, jest.fn()];
    },
    useCallback: (fn: any, deps: any) => mockUseCallback(fn, deps),
    useEffect: (fn: any, deps: any) => mockUseEffect(fn, deps),
  };
});

// ===================================================================
// useCashStealthBalance
// ===================================================================

describe('useCashStealthBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stateCallCount = 0;
    mockUseCallback.mockImplementation((fn: any, _deps: any) => fn);
    mockUseEffect.mockImplementation((fn: any, _deps: any) => fn());
    mockApiGet.mockResolvedValue({
      mainBalance: 1000000,
      stealthBalance: 500000,
      totalBalance: 1500000,
      stealthPayments: [],
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should expose { mainBalance, stealthBalance, totalBalance, stealthPayments, isLoading, error, refreshBalance }', () => {
    const { useCashStealthBalance } = require('../hooks/useCashStealthBalance');
    const result = useCashStealthBalance();

    expect(result).toHaveProperty('mainBalance');
    expect(result).toHaveProperty('stealthBalance');
    expect(result).toHaveProperty('totalBalance');
    expect(result).toHaveProperty('stealthPayments');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refreshBalance');
    expect(typeof result.refreshBalance).toBe('function');
  });

  it('should call GET /api/stealth/cash/balance on mount', async () => {
    const { useCashStealthBalance } = require('../hooks/useCashStealthBalance');
    useCashStealthBalance();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(mockApiGet).toHaveBeenCalledWith('/api/stealth/cash/balance');
  });

  it('should set up a 30-second polling interval', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const { useCashStealthBalance } = require('../hooks/useCashStealthBalance');
    useCashStealthBalance();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
    setIntervalSpy.mockRestore();
  });

  it('should re-fetch after 30 seconds', async () => {
    const { useCashStealthBalance } = require('../hooks/useCashStealthBalance');
    useCashStealthBalance();

    // Fetch initial
    await Promise.resolve();
    expect(mockApiGet).toHaveBeenCalledTimes(1);

    // Avance de 30 secondes
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it('should re-fetch when refreshBalance() is called', async () => {
    const { useCashStealthBalance } = require('../hooks/useCashStealthBalance');
    const result = useCashStealthBalance();

    await Promise.resolve();
    expect(mockApiGet).toHaveBeenCalledTimes(1);

    result.refreshBalance();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });
});
