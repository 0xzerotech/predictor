import * as anchor from '@coral-xyz/anchor';
import { Keypair, SystemProgram, PublicKey, Connection, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Transaction, clusterApiUrl } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const url = process.env.RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(url, 'confirmed');
  const walletPath = process.env.SOLANA_WALLET || path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.config/solana/id.json');
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')));
  const payer = Keypair.fromSecretKey(secret);
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const programId = new PublicKey('PredMark111111111111111111111111111111111111');
  const idlPath = path.resolve(__dirname, '../target/idl/prediction_market.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const program = new anchor.Program(idl, programId, provider);

  // Create market account
  const market = Keypair.generate();
  const yesVault = Keypair.generate();
  const noVault = Keypair.generate();

  // Create zero-space system accounts for vaults
  for (const kp of [yesVault, noVault]) {
    const tx = new Transaction().add(SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: kp.publicKey,
      lamports: 1, // just to create the account; program will credit vaults
      space: 0,
      programId: SystemProgram.programId,
    }));
    await sendAndConfirmTransaction(connection, tx, [payer, kp]);
  }

  // Airdrop if needed
  const bal = await connection.getBalance(payer.publicKey);
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
  }

  console.log('Creating market...');
  await program.methods
    .createMarket(payer.publicKey)
    .accounts({
      market: market.publicKey,
      creator: payer.publicKey,
      yesVault: yesVault.publicKey,
      noVault: noVault.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([market])
    .rpc();
  console.log('Market:', market.publicKey.toBase58());

  // Compute user position PDA
  const [userPos] = PublicKey.findProgramAddressSync(
    [Buffer.from('pos'), market.publicKey.toBuffer(), payer.publicKey.toBuffer()],
    program.programId,
  );

  const protocolFee = Keypair.generate();
  // Create protocol fee account to receive lamports
  {
    const tx = new Transaction().add(SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: protocolFee.publicKey,
      lamports: 1,
      space: 0,
      programId: SystemProgram.programId,
    }));
    await sendAndConfirmTransaction(connection, tx, [payer, protocolFee]);
  }

  console.log('Buying YES for 0.1 SOL...');
  await program.methods
    .buySide({ yes: {} } as any, new anchor.BN(0.1 * LAMPORTS_PER_SOL))
    .accounts({
      market: market.publicKey,
      userPosition: userPos,
      buyer: payer.publicKey,
      yesVault: yesVault.publicKey,
      noVault: noVault.publicKey,
      protocolFee: protocolFee.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('Resolving market to YES...');
  await program.methods
    .resolveMarket({ yes: {} } as any)
    .accounts({ market: market.publicKey, resolver: payer.publicKey })
    .rpc();

  console.log('Done. Check balances in explorer.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


