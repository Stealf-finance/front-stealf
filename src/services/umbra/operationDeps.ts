/**
 * Shared deps passed to every Umbra SDK factory function used in this app.
 *
 * The SDK's default behaviour after each MPC computation is to also send a
 * separate `claim_computation_rent` transaction. With a Seeker / MWA signer,
 * that means an extra biometric prompt for every deposit, withdraw, transfer
 * and claim. Disabling it cuts one popup off every privacy operation. The
 * ~0.002 SOL of rent stays locked on the computation account and can be
 * reclaimed later in a batched offline sweep, so this is purely a UX win.
 *
 * We still await the MPC callback (the option is `{ reclaimComputationRent:
 * false }`, not `false`), so the SDK still resolves with a confirmed
 * encrypted balance update — no fire-and-forget surprises.
 */
export const UMBRA_OPERATION_DEPS = {
  arcium: {
    awaitComputationFinalization: {
      reclaimComputationRent: false,
    },
  },
} as const;
