/**
 * Tests for yield signing hooks: useYieldDepositAndConfirm, useYieldWithdrawAndConfirm
 *
 * Requirements covered:
 * - 8.2: Hooks React Query pour yield
 * - 8.5: Loading indicator during transaction confirmation
 * - 9.1: Non-custodial (backend builds tx, user signs)
 * - 1.6: Backend never holds user private keys
 */

// --- Mocks ---

// Mock Turnkey
const mockSignAndSendTransaction = jest.fn().mockResolvedValue("mock-turnkey-sig-123");
const mockWallets = [
  {
    accounts: [{ address: "UserWallet111111111111111111111111111111111" }],
  },
];
jest.mock("@turnkey/react-native-wallet-kit", () => ({
  useTurnkey: () => ({
    signAndSendTransaction: mockSignAndSendTransaction,
    wallets: mockWallets,
    session: { token: "mock-turnkey-token" },
  }),
}));

// Mock Auth context
let mockIsWalletAuth = false;
let mockUserData: any = {
  cash_wallet: "UserWallet111111111111111111111111111111111",
  stealf_wallet: "StealfWallet11111111111111111111111111111",
};
jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    isWalletAuth: mockIsWalletAuth,
    userData: mockUserData,
  }),
}));

// Mock Session context
const mockSetMWAInProgress = jest.fn();
jest.mock("../contexts/SessionContext", () => ({
  useSession: () => ({
    setMWAInProgress: mockSetMWAInProgress,
  }),
}));

// Mock API client
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock("../services/clientStealf", () => ({
  useAuthenticatedApi: () => ({
    get: mockApiGet,
    post: mockApiPost,
  }),
}));

// Mock Socket.io
jest.mock("../services/socketService", () => ({
  socketService: {
    on: jest.fn(),
    off: jest.fn(),
  },
}));

// Mock Solana wallet bridge
const mockBridgeSignTransaction = jest.fn().mockResolvedValue(new Uint8Array(100));
jest.mock("../services/solanaWalletBridge", () => ({
  createSeedVaultWallet: jest.fn(() => ({
    signTransaction: mockBridgeSignTransaction,
  })),
}));

// Mock @solana/web3.js Connection
const mockSendRawTransaction = jest.fn().mockResolvedValue("mock-raw-sig-456");
const mockConfirmTransaction = jest.fn().mockResolvedValue({ value: { err: null } });
jest.mock("@solana/web3.js", () => {
  const actual = jest.requireActual("@solana/web3.js");
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      sendRawTransaction: mockSendRawTransaction,
      confirmTransaction: mockConfirmTransaction,
    })),
    Transaction: {
      from: jest.fn().mockReturnValue({
        serialize: jest.fn().mockReturnValue(Buffer.from("mock-serialized-tx")),
      }),
    },
  };
});

// Mock React Query
const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueryData: jest.fn(),
    }),
    useMutation: (opts: any) => ({
      mutateAsync: async (args: any) => {
        const result = await opts.mutationFn(args);
        opts.onSuccess?.();
        return result;
      },
      isLoading: false,
    }),
    useQuery: (opts: any) => ({
      data: null,
      isLoading: false,
    }),
  };
});

// --- Import after mocks ---
import {
  useYieldDepositAndConfirm,
  useYieldWithdrawAndConfirm,
} from "../hooks/useYield";

// --- Tests ---

describe("useYieldDepositAndConfirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWalletAuth = false;
    mockUserData = {
      cash_wallet: "UserWallet111111111111111111111111111111111",
      stealf_wallet: "StealfWallet11111111111111111111111111111",
    };
    mockApiPost.mockReset();
  });

  it("should exist as an exported function", () => {
    expect(typeof useYieldDepositAndConfirm).toBe("function");
  });

  it("should call backend deposit endpoint and sign with Turnkey (passkey auth)", async () => {
    mockIsWalletAuth = false;

    // Backend returns unsigned transaction
    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("mock-unsigned-tx").toString("base64"),
        message: "Deposit 0.1 SOL into vault",
      })
      // Confirm call
      .mockResolvedValueOnce({ success: true, shareId: "share-123" });

    const hook = useYieldDepositAndConfirm();
    const result = await hook.mutateAsync({
      amount: 0.1,
      vaultType: "sol_jito",
    });

    // Step 1: Backend called to build tx
    expect(mockApiPost).toHaveBeenCalledWith("/api/yield/deposit", {
      amount: 0.1,
      vaultType: "sol_jito",
      private: false,
    });

    // Step 2: Turnkey signs
    expect(mockSignAndSendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: "TRANSACTION_TYPE_SOLANA",
      })
    );

    // Step 3: Confirm called with signature
    expect(mockApiPost).toHaveBeenCalledWith("/api/yield/confirm", {
      signature: "mock-turnkey-sig-123",
      type: "deposit",
      vaultType: "sol_jito",
      amount: 0.1,
      private: false,
    });

    // Step 4: returns signature
    expect(result).toEqual({ signature: "mock-turnkey-sig-123" });
  });

  it("should sign via MWA bridge for wallet auth (Seeker path)", async () => {
    mockIsWalletAuth = true;
    mockUserData = {
      cash_wallet: "StealfWallet11111111111111111111111111111",
      stealf_wallet: "StealfWallet11111111111111111111111111111",
      authMethod: "wallet",
    };

    // Pre-fill MWA auth token in SecureStore mock
    const SecureStore = require("expo-secure-store");
    SecureStore.getItemAsync.mockResolvedValueOnce("mock-mwa-token");

    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("mock-unsigned-tx").toString("base64"),
        message: "Deposit",
      })
      .mockResolvedValueOnce({ success: true });

    const hook = useYieldDepositAndConfirm();
    await hook.mutateAsync({ amount: 0.5, vaultType: "sol_marinade" });

    // MWA bridge should be called
    expect(mockSetMWAInProgress).toHaveBeenCalledWith(true);
    expect(mockBridgeSignTransaction).toHaveBeenCalled();
    expect(mockSendRawTransaction).toHaveBeenCalled();
    expect(mockSetMWAInProgress).toHaveBeenCalledWith(false);
  });

  it("should pass private flag when isPrivate is true", async () => {
    mockIsWalletAuth = false;

    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("tx").toString("base64"),
        message: "Private deposit",
      })
      .mockResolvedValueOnce({ success: true });

    const hook = useYieldDepositAndConfirm();
    await hook.mutateAsync({
      amount: 1,
      vaultType: "sol_jito",
      isPrivate: true,
    });

    expect(mockApiPost).toHaveBeenCalledWith("/api/yield/deposit", {
      amount: 1,
      vaultType: "sol_jito",
      private: true,
    });
  });

  it("should invalidate balance and dashboard queries on success", async () => {
    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("tx").toString("base64"),
        message: "ok",
      })
      .mockResolvedValueOnce({ success: true });

    const hook = useYieldDepositAndConfirm();
    await hook.mutateAsync({ amount: 0.1, vaultType: "sol_jito" });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["yield-balance"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["yield-dashboard"],
    });
  });
});

describe("useYieldWithdrawAndConfirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockReset();
  });

  it("should exist as an exported function", () => {
    expect(typeof useYieldWithdrawAndConfirm).toBe("function");
  });

  it("should broadcast pre-signed withdrawal tx without re-signing", async () => {
    // Backend returns ALREADY SIGNED transaction for withdrawals
    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("already-signed-withdraw-tx").toString("base64"),
        estimatedSolOut: 0.099,
        slippagePercent: 0.1,
      })
      .mockResolvedValueOnce({ success: true });

    const hook = useYieldWithdrawAndConfirm();
    const result = await hook.mutateAsync({
      amount: 0.1,
      vaultType: "sol_jito",
    });

    // Step 1: Backend called to build + sign withdraw tx
    expect(mockApiPost).toHaveBeenCalledWith("/api/yield/withdraw", {
      amount: 0.1,
      vaultType: "sol_jito",
      private: false,
    });

    // Step 2: Just broadcast — NO Turnkey signing (authority already signed)
    expect(mockSignAndSendTransaction).not.toHaveBeenCalled();
    expect(mockSendRawTransaction).toHaveBeenCalled();

    // Step 3: Wait for confirmation
    expect(mockConfirmTransaction).toHaveBeenCalled();

    // Step 4: Confirm with backend
    expect(mockApiPost).toHaveBeenCalledWith("/api/yield/confirm", {
      signature: "mock-raw-sig-456",
      type: "withdraw",
      vaultType: "sol_jito",
      amount: 0.1,
      private: false,
    });

    expect(result).toEqual({ signature: "mock-raw-sig-456" });
  });

  it("should invalidate queries on success", async () => {
    mockApiPost
      .mockResolvedValueOnce({
        transaction: Buffer.from("tx").toString("base64"),
        estimatedSolOut: 1,
        slippagePercent: 0,
      })
      .mockResolvedValueOnce({ success: true });

    const hook = useYieldWithdrawAndConfirm();
    await hook.mutateAsync({ amount: 1, vaultType: "sol_marinade" });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["yield-balance"],
    });
  });
});

describe("Existing hooks backward-compatibility", () => {
  it("useYieldDeposit should still be exported (raw API call, no signing)", async () => {
    const { useYieldDeposit } = require("../hooks/useYield");
    expect(typeof useYieldDeposit).toBe("function");
  });

  it("useYieldWithdraw should still be exported", async () => {
    const { useYieldWithdraw } = require("../hooks/useYield");
    expect(typeof useYieldWithdraw).toBe("function");
  });

  it("useYieldConfirm should still be exported", async () => {
    const { useYieldConfirm } = require("../hooks/useYield");
    expect(typeof useYieldConfirm).toBe("function");
  });

  it("useYieldBalance should still be exported", async () => {
    const { useYieldBalance } = require("../hooks/useYield");
    expect(typeof useYieldBalance).toBe("function");
  });

  it("useYieldDashboard should still be exported", async () => {
    const { useYieldDashboard } = require("../hooks/useYield");
    expect(typeof useYieldDashboard).toBe("function");
  });

  it("useYieldAPY should still be exported", async () => {
    const { useYieldAPY } = require("../hooks/useYield");
    expect(typeof useYieldAPY).toBe("function");
  });
});
