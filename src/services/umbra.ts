import {
  createSignerFromPrivateKeyBytes,
  getUmbraClientFromSigner,
  getUserRegistrationFunction,
  getDirectDepositIntoEncryptedBalanceFunction,
  getDirectWithdrawIntoPublicBalanceV3Function,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction,
  getCreateSelfClaimableUtxoFromEncryptedBalanceFunction,
  getFetchClaimableUtxosFunction,
  getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction,
} from "@umbra-privacy/sdk";
import type { IUmbraClient, IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import {
  getUserRegistrationProver,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceProver,
  getCreateSelfClaimableUtxoFromEncryptedBalanceProver,
  getClaimSelfClaimableUtxoIntoEncryptedBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
} from "@umbra-privacy/web-zk-prover";
import bs58 from "bs58";
import { walletKeyCache } from "./walletKeyCache";
import { masterSeedStorage, umbraClearSeed } from "./umbraSeed";

export { umbraClearSeed };

// --- Config ---

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || "";
const INDEXER_URL = "https://acqzie0a1h.execute-api.eu-central-1.amazonaws.com";
const NETWORK = "devnet" as const;


async function createStealfSigner(): Promise<IUmbraSigner> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error("No stealf_wallet key available — wallet setup required");
  }

  const secretKeyBytes = bs58.decode(privateKeyB58);

  return createSignerFromPrivateKeyBytes(secretKeyBytes);
}


let cachedClient: IUmbraClient | null = null;
let cachedSignerAddress: string | null = null;

export async function getUmbraClient(): Promise<IUmbraClient> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error("No stealf_wallet key — cannot create Umbra client");
  }

  if (cachedClient && cachedSignerAddress !== privateKeyB58) {
    cachedClient = null;
  }

  if (cachedClient) return cachedClient;

  const signer = await createStealfSigner();

  cachedClient = await getUmbraClientFromSigner(
    {
      signer,
      network: NETWORK,
      rpcUrl: RPC_URL,
      rpcSubscriptionsUrl: WSS_URL,
      indexerApiEndpoint: INDEXER_URL,
      deferMasterSeedSignature: true,
    },
    {
      masterSeedStorage: masterSeedStorage as any,
    }
  );

  cachedSignerAddress = privateKeyB58;
  return cachedClient;
}

export function clearUmbraClient(): void {
  cachedClient = null;
  cachedSignerAddress = null;
}


export async function umbraRegister(): Promise<string[]> {
  const client = await getUmbraClient();
  const register = getUserRegistrationFunction(
    { client },
    { zkProver: getUserRegistrationProver() }
  );

  const signatures = await register({
    confidential: true,
    anonymous: true,
  });

  return signatures;
}


export async function umbraDeposit(
  mint: string,
  amount: bigint,
  destinationAddress?: string
): Promise<string> {
  const client = await getUmbraClient();
  const deposit = getDirectDepositIntoEncryptedBalanceFunction({ client });

  const destination = destinationAddress || client.signer.address;
  return deposit(destination as any, mint as any, amount as any);
}


export async function umbraWithdraw(
  mint: string,
  amount: bigint,
  destinationAddress?: string
): Promise<string> {
  const client = await getUmbraClient();
  const withdraw = getDirectWithdrawIntoPublicBalanceV3Function({ client });

  const destination = destinationAddress || client.signer.address;
  return withdraw(destination as any, mint as any, amount as any);
}


export async function umbraSendPrivate(
  recipientAddress: string,
  mint: string,
  amount: bigint
): Promise<string[]> {
  const client = await getUmbraClient();
  const zkProver = getCreateReceiverClaimableUtxoFromEncryptedBalanceProver();
  const createUtxo = getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction(
    { client },
    { zkProver }
  );

  return createUtxo({
    destinationAddress: recipientAddress as any,
    mint: mint as any,
    amount: amount as any,
  });
}


export async function umbraSelfShield(
  mint: string,
  amount: bigint
): Promise<string[]> {
  const client = await getUmbraClient();
  const zkProver = getCreateSelfClaimableUtxoFromEncryptedBalanceProver();
  const createUtxo = getCreateSelfClaimableUtxoFromEncryptedBalanceFunction(
    { client },
    { zkProver }
  );

  return createUtxo({
    destinationAddress: client.signer.address as any,
    mint: mint as any,
    amount: amount as any,
  });
}


export interface ClaimableUtxos {
  ephemeral: any[];
  receiver: any[];
  publicEphemeral: any[];
  publicReceiver: any[];
}

export async function umbraFetchClaimable(
  treeIndex = 0,
  startInsertionIndex = 0
): Promise<ClaimableUtxos> {
  const client = await getUmbraClient();
  const fetchUtxos = getFetchClaimableUtxosFunction({ client });

  return fetchUtxos(treeIndex, startInsertionIndex);
}


export async function umbraClaimSelfUtxos(utxos: any[]): Promise<string[]> {
  if (utxos.length === 0) return [];

  const client = await getUmbraClient();
  const zkProver = getClaimSelfClaimableUtxoIntoEncryptedBalanceProver();
  const claim = getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction(
    { client },
    { zkProver } as any
  );

  // claim takes utxos array directly, returns { signatures: Record<number, string[]> }
  const result = await claim(utxos);
  return Object.values(result.signatures).flat();
}

export async function umbraClaimReceivedUtxos(utxos: any[]): Promise<string[]> {
  if (utxos.length === 0) return [];

  const client = await getUmbraClient();
  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  const claim = getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction(
    { client },
    { zkProver } as any
  );

  const result = await claim(utxos);
  return Object.values(result.signatures).flat();
}


