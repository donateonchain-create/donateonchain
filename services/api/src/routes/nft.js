/**
 * NFT Minting Route
 *
 * POST /api/nft/mint
 * - Called by the frontend after a successful on-chain donation
 * - Mints a proof-of-donation NFT serial and transfers it to the donor
 *
 * Body: { donorAddress, campaignId, txHash, amount }
 * Auth: x-api-key (KYC_ADMIN_API_KEY) — or accept unauthenticated with rate limit
 */
import express from 'express';
import { Client, PrivateKey, AccountId, TokenMintTransaction, TransferTransaction, NftId, TokenId } from '@hashgraph/sdk';

const router = express.Router();

const operatorId  = process.env.ACCOUNT_ID;
const rawKey      = process.env.PRIVATE_KEY?.replace('0x', '');
const nftTokenId  = process.env.NFT_TOKEN_ID; // e.g. "0.0.8318134"

function buildHederaClient() {
  if (!operatorId || !rawKey) return null;
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromStringECDSA(rawKey));
  return client;
}

/**
 * POST /api/nft/mint
 */
router.post('/mint', async (req, res) => {
  const { donorAddress, campaignId, txHash, amount } = req.body ?? {};

  if (!donorAddress || !txHash) {
    return res.status(400).json({ error: 'Missing donorAddress or txHash' });
  }

  if (!nftTokenId) {
    return res.status(503).json({ error: 'NFT_TOKEN_ID not configured on server' });
  }

  const client = buildHederaClient();
  if (!client) {
    return res.status(503).json({ error: 'Hedera client not configured (missing ACCOUNT_ID/PRIVATE_KEY)' });
  }

  try {
    // Build the NFT metadata (IPFS or inline JSON)
    const metadata = Buffer.from(JSON.stringify({
      type: 'DonateOnChain Proof of Donation',
      donor: donorAddress,
      campaignId: String(campaignId ?? ''),
      amount: String(amount ?? ''),
      txHash,
      timestamp: new Date().toISOString(),
    }));

    // Step 1: Mint a new serial number
    const mintTx = await new TokenMintTransaction()
      .setTokenId(nftTokenId)
      .addMetadata(metadata)
      .setMaxTransactionFee(5_000_000) // 5 HBAR max gas
      .execute(client);

    const mintReceipt  = await mintTx.getReceipt(client);
    const serialNumber = mintReceipt.serials[0];

    req.log.info({ serialNumber: serialNumber.toNumber(), donorAddress }, 'NFT minted');

    // Step 2: Resolve the donor Hedera Account ID from EVM address
    // Mirror node lookup: GET /api/v1/accounts/{evmAddress}
    const mirrorUrl  = process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
    const cleanAddr  = donorAddress.toLowerCase().replace('0x', '');
    const mirrorResp = await fetch(`${mirrorUrl}/api/v1/accounts/0x${cleanAddr}`);

    if (!mirrorResp.ok) {
      // Transfer skipped — donor must manually associate and we notify them
      client.close();
      return res.json({
        success: true,
        serialNumber: serialNumber.toNumber(),
        tokenId: nftTokenId,
        warning: 'NFT minted but transfer skipped — donor account not found in mirror node. They can claim it via the explorer.',
      });
    }

    const mirrorData    = await mirrorResp.json();
    const donorAccountId = mirrorData?.account; // e.g. "0.0.12345"

    if (!donorAccountId) {
      client.close();
      return res.json({
        success: true,
        serialNumber: serialNumber.toNumber(),
        tokenId: nftTokenId,
        warning: 'NFT minted but donor account ID not resolved. They must associate the token and claim the NFT.',
      });
    }

    // Step 3: Transfer NFT from treasury (operator) to donor
    const transferTx = await new TransferTransaction()
      .addNftTransfer(new NftId(TokenId.fromString(nftTokenId), serialNumber), AccountId.fromString(operatorId), AccountId.fromString(donorAccountId))
      .setMaxTransactionFee(2_000_000)
      .execute(client);

    await transferTx.getReceipt(client);

    req.log.info({ serialNumber: serialNumber.toNumber(), donorAccountId }, 'NFT transferred to donor');

    client.close();

    return res.json({
      success: true,
      serialNumber: serialNumber.toNumber(),
      tokenId: nftTokenId,
      donorAccountId,
      explorerUrl: `https://hashscan.io/testnet/token/${nftTokenId}/${serialNumber}`,
    });
  } catch (err) {
    client.close();
    req.log.error(err, 'NFT mint/transfer failed');
    return res.status(500).json({ error: 'NFT mint failed', details: err.message });
  }
});

export default router;
