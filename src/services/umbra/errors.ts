import {
  isRegistrationError,
  isEncryptedDepositError,
  isEncryptedWithdrawalError,
  isCreateUtxoError,
  isClaimUtxoError,
  isFetchUtxosError,
} from "@umbra-privacy/sdk";

export {
  isRegistrationError,
  isEncryptedDepositError,
  isEncryptedWithdrawalError,
  isCreateUtxoError,
  isClaimUtxoError,
  isFetchUtxosError,
};

export type UmbraOp =
  | "register"
  | "deposit"
  | "depositFromCash"
  | "withdraw"
  | "sendPrivate"
  | "selfShield"
  | "claimReceived"
  | "claimSelfToPublic"
  | "fetchClaims"
  | "fetchBalances";

export type UmbraErrorCode =
  | "REGISTRATION_REJECTED"
  | "REGISTRATION_PROOF_FAILED"
  | "USER_NOT_REGISTERED"
  | "RECEIVER_NOT_REGISTERED"

  | "INSUFFICIENT_BALANCE"

  | "ZK_PROOF_ERROR"

  | "USER_CANCELLED"
  | "TX_TIMEOUT"
  | "TX_VALIDATION_FAILED"

  | "RPC_ERROR"
  | "INDEXER_ERROR"

  | "VERIFYING_KEY_NOT_INITIALIZED"
  | "STALE_MERKLE_PROOF"

  | "SIGNING_FAILED"
  | "UNKNOWN";

export class UmbraError extends Error {
  code: UmbraErrorCode;
  op: UmbraOp;
  stage?: string;
  userMessage: string;
  cause?: unknown;

  constructor(args: {
    code: UmbraErrorCode;
    op: UmbraOp;
    rawMessage: string;
    userMessage: string;
    stage?: string;
    cause?: unknown;
  }) {
    super(args.rawMessage);
    this.name = "UmbraError";
    this.code = args.code;
    this.op = args.op;
    this.stage = args.stage;
    this.userMessage = args.userMessage;
    this.cause = args.cause;
  }
}

const MSG: Record<UmbraErrorCode, string> = {
  REGISTRATION_REJECTED: "Registration cancelled.",
  REGISTRATION_PROOF_FAILED: "Failed to generate proof. Please try again.",
  USER_NOT_REGISTERED: "Your privacy wallet is not registered yet. Try again in a few seconds.",
  RECEIVER_NOT_REGISTERED:
    "Recipient is not a Stealf user yet. Ask them to set up their privacy wallet first.",
  INSUFFICIENT_BALANCE: "Insufficient balance to complete this transaction.",
  ZK_PROOF_ERROR: "Failed to generate the privacy proof. Please try again.",
  USER_CANCELLED: "Transaction cancelled.",
  TX_TIMEOUT:
    "Confirmation timed out. The transaction may still have landed — please check your balance before retrying.",
  TX_VALIDATION_FAILED: "Transaction pre-flight failed. Please retry.",
  RPC_ERROR: "Network error. Please check your connection and try again.",
  INDEXER_ERROR: "Could not reach the network. Please check your connection.",
  VERIFYING_KEY_NOT_INITIALIZED:
    "Umbra protocol is not fully deployed on this network. Please contact support.",
  STALE_MERKLE_PROOF: "This claim is out of date. Please refresh and try again.",
  SIGNING_FAILED: "Signing failed. Please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

function rawMessageOf(err: any): string {
  return err?.cause?.message || err?.message || "Operation failed";
}

function build(
  err: any,
  op: UmbraOp,
  code: UmbraErrorCode,
  stage?: string,
  override?: string
): UmbraError {
  return new UmbraError({
    code,
    op,
    stage,
    rawMessage: rawMessageOf(err),
    userMessage: override ?? MSG[code],
    cause: err?.cause ?? err,
  });
}

/**
 * Parse a raw SDK error into an `UmbraError` with a stable code.
 *
 * Uses Umbra's typed error guards when possible, falling back to message
 * inspection for the long tail.
 */
export function parseUmbraError(err: any, op: UmbraOp): UmbraError {

    if (err instanceof UmbraError) return err;

  if (isRegistrationError(err)) {
    switch (err.stage) {
      case "master-seed-derivation":
      case "transaction-sign":
        return build(err, op, "REGISTRATION_REJECTED", err.stage);
      case "zk-proof-generation":
        return build(err, op, "REGISTRATION_PROOF_FAILED", err.stage);
      case "account-fetch":
        return build(err, op, "RPC_ERROR", err.stage);
      case "transaction-send":
        return build(err, op, "TX_TIMEOUT", err.stage);
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  if (isEncryptedDepositError(err)) {
    switch (err.stage) {
      case "validation":
        return build(err, op, "UNKNOWN", err.stage, "Invalid deposit parameters.");
      case "mint-fetch":
      case "account-fetch":
        return build(err, op, "RPC_ERROR", err.stage);
      case "transaction-sign":
        return build(
          err,
          op,
          op === "depositFromCash" ? "SIGNING_FAILED" : "USER_CANCELLED",
          err.stage
        );
      case "transaction-send": {
        const logs: string[] = err?.cause?.context?.logs || [];
        if (logs.some((l: string) => /insufficient/i.test(l))) {
          return build(err, op, "INSUFFICIENT_BALANCE", err.stage);
        }
        return build(err, op, "TX_TIMEOUT", err.stage);
      }
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  if (isEncryptedWithdrawalError(err)) {
    switch (err.stage) {
      case "validation":
        return build(err, op, "INSUFFICIENT_BALANCE", err.stage);
      case "mint-fetch":
        return build(err, op, "RPC_ERROR", err.stage);
      case "transaction-sign":
        return build(err, op, "USER_CANCELLED", err.stage);
      case "transaction-send":
        return build(err, op, "TX_TIMEOUT", err.stage);
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  if (isCreateUtxoError(err)) {
    switch (err.stage) {
      case "zk-proof-generation":
        return build(err, op, "ZK_PROOF_ERROR", err.stage);
      case "transaction-sign":
        return build(err, op, "USER_CANCELLED", err.stage);
      case "account-fetch":
        return build(err, op, "RPC_ERROR", err.stage);
      case "transaction-send":
        return build(err, op, "TX_TIMEOUT", err.stage);
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  if (isClaimUtxoError(err)) {
    switch (err.stage) {
      case "zk-proof-generation":
        return build(err, op, "ZK_PROOF_ERROR", err.stage);
      case "transaction-sign":
        return build(err, op, "USER_CANCELLED", err.stage);
      case "transaction-validate":
        return build(err, op, "STALE_MERKLE_PROOF", err.stage);
      case "transaction-send":
        return build(err, op, "TX_TIMEOUT", err.stage);
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  if (isFetchUtxosError(err)) {
    switch (err.stage) {
      case "indexer-fetch":
      case "proof-fetch":
        return build(err, op, "INDEXER_ERROR", err.stage);
      default:
        return build(err, op, "UNKNOWN", err.stage);
    }
  }

  const rawMessage = rawMessageOf(err);
  const simulationLogs: string[] = err?.cause?.context?.logs || [];

  // Mobile Wallet Adapter: bubbles up Java/Kotlin exceptions verbatim.
  // CancellationException = user dismissed the Seed Vault popup or the
  // transact() session was preempted (e.g. another MWA call started).
  if (/CancellationException|cancelled|canceled|user.*declined/i.test(rawMessage)) {
    return build(err, op, "USER_CANCELLED");
  }

  if (/receiver is not registered/i.test(rawMessage)) {
    return build(err, op, "RECEIVER_NOT_REGISTERED");
  }
  if (/user is not registered|account.*not.*initialised|not registered/i.test(rawMessage)) {
    return build(err, op, "USER_NOT_REGISTERED");
  }
  if (simulationLogs.some((l) => /zero_knowledge_verifying_key/i.test(l))) {
    return build(err, op, "VERIFYING_KEY_NOT_INITIALIZED");
  }
  if (
    /insufficient/i.test(rawMessage) ||
    simulationLogs.some((l) => /insufficient (funds|lamports)/i.test(l))
  ) {
    return build(err, op, "INSUFFICIENT_BALANCE");
  }
  if (/rpc|network|fetch|timeout/i.test(rawMessage)) {
    return build(err, op, "RPC_ERROR");
  }

  return build(err, op, "UNKNOWN");
}
