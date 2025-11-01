import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { HyperPrediction } from "../target/types/hyper_prediction";

const GLOBAL_SEED = Buffer.from("global");
const MARKET_SEED = Buffer.from("market");
const ATTENTION_VAULT_SEED = Buffer.from("attention");
const QUOTE_VAULT_SEED = Buffer.from("quote");
const CURVE_SEED = Buffer.from("curve");
const RESOLUTION_SEED = Buffer.from("resolution");

describe("hyper_prediction", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.HyperPrediction as Program<HyperPrediction>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  const treasury = wallet.publicKey;

  let quoteMint: PublicKey;
  let globalState: PublicKey;
  let attentionMint: Keypair;
  let globalAttentionVault: PublicKey;

  let marketMint: Keypair;
  let marketPda: PublicKey;
  let marketBump: number;
  let marketQuoteVault: PublicKey;
  let marketQuoteVaultBump: number;
  let marketAttentionVault: PublicKey;
  let marketAttentionVaultBump: number;
  let curvePda: PublicKey;
  let curveBump: number;
  let resolutionPda: PublicKey;

  let user: Keypair;
  let userQuoteAta: PublicKey;
  let userShareAta: PublicKey;
  let creatorQuoteAta: PublicKey;
  let treasuryQuoteAta: PublicKey;

  before(async () => {
    const airdropSig = await connection.requestAirdrop(wallet.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig, "confirmed");

    quoteMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6
    );

    [globalState] = await PublicKey.findProgramAddress(
      [GLOBAL_SEED],
      program.programId
    );

    [globalAttentionVault] = await PublicKey.findProgramAddress(
      [GLOBAL_SEED, Buffer.from("attn")],
      program.programId
    );

    attentionMint = Keypair.generate();

    await program.methods
      .initializeGlobal(
        600,
        200,
        100,
        new anchor.BN(1),
        new anchor.BN(1)
      )
      .accounts({
        authority: wallet.publicKey,
        globalState,
        attentionMint: attentionMint.publicKey,
        globalAttentionVault,
        quoteMint,
        treasury,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([attentionMint])
      .rpc();

    marketMint = Keypair.generate();
    [marketPda, marketBump] = await PublicKey.findProgramAddress(
      [MARKET_SEED, globalState.toBuffer(), marketMint.publicKey.toBuffer()],
      program.programId
    );
    [marketQuoteVault, marketQuoteVaultBump] = await PublicKey.findProgramAddress(
      [QUOTE_VAULT_SEED, marketPda.toBuffer()],
      program.programId
    );
    [marketAttentionVault, marketAttentionVaultBump] = await PublicKey.findProgramAddress(
      [ATTENTION_VAULT_SEED, marketPda.toBuffer()],
      program.programId
    );
    [curvePda, curveBump] = await PublicKey.findProgramAddress(
      [CURVE_SEED, marketPda.toBuffer()],
      program.programId
    );

    await program.methods
      .createMarket({
        basePrice: new anchor.BN(1_000_000),
        slopeBps: new anchor.BN(500),
        curvatureBps: new anchor.BN(25),
        maxSupply: new anchor.BN(1_000_000_000),
        metadata: Buffer.from(JSON.stringify({
          title: "Will GPT-6 reach AGI vibes?",
          description: "Hyper aesthetic bond-curve price discovery for AGI vibes",
          image: "https://hyper.example/media/agi.gif",
        })),
        bondVolumeOverride: new anchor.BN(1),
        bondLiquidityOverride: new anchor.BN(1),
      })
      .accounts({
        globalState,
        marketCreator: wallet.publicKey,
        market: marketPda,
        marketMint: marketMint.publicKey,
        marketQuoteVault,
        marketAttentionVault,
        curve: curvePda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketMint])
      .rpc();

    user = Keypair.generate();
    const userAirdrop = await connection.requestAirdrop(user.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(userAirdrop, "confirmed");

    userQuoteAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        quoteMint,
        user.publicKey
      )
    ).address;
    userShareAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        marketMint.publicKey,
        user.publicKey
      )
    ).address;
    creatorQuoteAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        quoteMint,
        wallet.publicKey
      )
    ).address;
    treasuryQuoteAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        quoteMint,
        treasury
      )
    ).address;

    await mintTo(
      connection,
      wallet.payer,
      quoteMint,
      userQuoteAta,
      wallet.publicKey,
      5_000_000_000n
    );
  });

  it("executes the full speculative flywheel", async () => {
    const buyQuantity = new anchor.BN(100_000_000); // 100 shares (6 decimals)
    const maxSpend = new anchor.BN(10_000_000_000);

    await program.methods
      .tradeCurve({
        direction: { buy: {} },
        quantity: buyQuantity,
        maxSpend,
        minReceive: new anchor.BN(0),
      })
      .accounts({
        globalState,
        market: marketPda,
        curve: curvePda,
        marketMint: marketMint.publicKey,
        marketQuoteVault,
        marketAttentionVault,
        userQuote: userQuoteAta,
        userShares: userShareAta,
        creatorFeeDestination: creatorQuoteAta,
        treasuryFeeDestination: treasuryQuoteAta,
        marketCreator: wallet.publicKey,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const userShareAccount = await getAccount(connection, userShareAta);
    expect(Number(userShareAccount.amount)).to.equal(Number(buyQuantity));

    const userAttentionAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        attentionMint.publicKey,
        user.publicKey
      )
    ).address;

    await program.methods
      .harvestAttention()
      .accounts({
        globalState,
        market: marketPda,
        marketAttentionVault,
        globalAttentionVault,
        attentionMint: attentionMint.publicKey,
        attnDestination: userAttentionAta,
        caller: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const resolver = wallet.publicKey;

    [resolutionPda] = await PublicKey.findProgramAddress(
      [RESOLUTION_SEED, marketPda.toBuffer()],
      program.programId
    );

    await program.methods
      .bondMarket()
      .accounts({
        globalState,
        market: marketPda,
        marketQuoteVault,
        resolution: resolutionPda,
        resolver,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .resolveMarket({ yes: {} }, new anchor.BN(2_000_000))
      .accounts({
        globalState,
        market: marketPda,
        resolution: resolutionPda,
        resolver,
      })
      .rpc();

    const preQuote = await getAccount(connection, userQuoteAta);

    await program.methods
      .redeem(new anchor.BN(50_000_000))
      .accounts({
        globalState,
        market: marketPda,
        resolution: resolutionPda,
        marketQuoteVault,
        userQuote: userQuoteAta,
        userShares: userShareAta,
        user: user.publicKey,
        marketMint: marketMint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const postQuote = await getAccount(connection, userQuoteAta);
    expect(Number(postQuote.amount)).to.be.greaterThan(Number(preQuote.amount));
  });
});

