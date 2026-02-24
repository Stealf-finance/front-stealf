export const transact = jest.fn(async (callback: any) => {
  const mockWallet = {
    authorize: jest.fn().mockResolvedValue({
      accounts: [{ address: Buffer.from('11111111111111111111111111111111').toString('base64') }],
      auth_token: 'mock-auth-token',
    }),
    signMessages: jest.fn().mockResolvedValue({
      signed_payloads: [new Uint8Array(64)],
    }),
    signTransactions: jest.fn().mockResolvedValue([
      {
        signatures: [{ signature: new Uint8Array(64).fill(1) }],
        serialize: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4])),
      },
    ]),
    signAndSendTransactions: jest.fn().mockResolvedValue(['mock-tx-signature']),
  };
  return callback(mockWallet);
});

export type Web3MobileWallet = any;
