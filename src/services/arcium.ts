import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  getArciumProgram,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
} from '@arcium-hq/client';

const PROGRAM_ID = new PublicKey('CRE9bxRgXenibicSpTDBZ3RdbhSDwbRchzYaHzjGMbLg');
const CLUSTER_OFFSET = 456;
const RPC_URL = ' https://api.devnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');