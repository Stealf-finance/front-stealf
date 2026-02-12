export const transact = jest.fn(async (callback: any) => {
  const mockWallet = {
    authorize: jest.fn().mockResolvedValue({
      accounts: [{ address: Buffer.from('11111111111111111111111111111111').toString('base64') }],
      auth_token: 'mock-auth-token',
    }),
    signMessages: jest.fn().mockResolvedValue({
      signed_payloads: [new Uint8Array(64)],
    }),
    signTransactions: jest.fn().mockResolvedValue({
      signed_payloads: [Buffer.from('signed-tx').toString('base64')],
    }),
    signAndSendTransactions: jest.fn().mockResolvedValue({
      signatures: ['mock-tx-signature'],
    }),
  };
  return callback(mockWallet);
});

export type Web3MobileWallet = any;
