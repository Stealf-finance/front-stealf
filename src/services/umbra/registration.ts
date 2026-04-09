import { getUserRegistrationFunction } from "@umbra-privacy/sdk";
import { createUserRegistrationProver } from "../../zk";
import { getClient } from "./client";

let registered = false;

export async function ensureRegistered(): Promise<void> {
  if (registered) return;
  try {
    const client = await getClient();
    const zkProver = await createUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    await register({ confidential: true, anonymous: true });
    registered = true;
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("already") || msg.includes("Already")) {
      registered = true;
      return;
    }
    throw err;
  }
}

/**
 * Reset the registration flag — typically called on logout / wallet switch
 * so the next operation will re-check the on-chain state for the new user.
 */
export function clearRegistration(): void {
  registered = false;
}
