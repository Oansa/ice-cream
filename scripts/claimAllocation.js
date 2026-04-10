#!/usr/bin/env node
/**
 * Ice Cream Vault Claim Script
 * Claims the hackathon allocation from the HackathonVault contract (Sepolia)
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// HackathonVault ABI
const HACKATHON_VAULT_ABI = [
  "function claimAllocation(uint256 agentId) external",
  "function getBalance(uint256 agentId) external view returns (uint256)",
  "function hasClaimed(uint256 agentId) external view returns (bool)",
  "function allocationPerTeam() external view returns (uint256)"
];

// Validation: Check required environment variables
function validateEnv() {
  const required = [
    "OPERATOR_PRIVATE_KEY",
    "AGENT_ID",
    "HACKATHON_VAULT_ADDRESS",
    "SEPOLIA_RPC_URL"
  ];

  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("\n❌ ERROR: Missing required environment variables:\n");
    for (const key of missing) {
      console.error(`   - ${key}`);
    }
    console.error("\nPlease add these to your .env file and try again.\n");
    process.exit(1);
  }
}

// Main claim function
async function main() {
  console.log("\n🍦 Ice Cream Vault Claim\n");

  // Step 1: Validate environment
  validateEnv();

  const agentId = BigInt(process.env.AGENT_ID);

  // Step 2: Set up provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);

  // Step 3: Connect to HackathonVault
  const vault = new ethers.Contract(
    process.env.HACKATHON_VAULT_ADDRESS,
    HACKATHON_VAULT_ABI,
    operatorWallet
  );

  // Step 4: Pre-flight checks
  console.log("📋 Pre-flight checks...\n");

  const operatorAddress = await operatorWallet.getAddress();
  const balance = await provider.getBalance(operatorAddress);
  const balanceEth = ethers.formatEther(balance);

  console.log(`   Operator wallet:   ${operatorAddress}`);
  console.log(`   Balance:           ${balanceEth} ETH\n`);

  if (balance < ethers.parseEther("0.005")) {
    console.warn("⚠️  WARNING: Low balance — you may not have enough ETH for gas.");
    console.warn("   Get Sepolia ETH from https://sepoliafaucet.com\n");
  }

  console.log(`   Agent ID:          ${agentId.toString()}`);
  console.log(`   Connecting to HackathonVault at ${process.env.HACKATHON_VAULT_ADDRESS}...\n`);

  // Step 5: Check claim status
  const alreadyClaimed = await vault.hasClaimed(agentId);
  if (alreadyClaimed) {
    console.log("⚠️  Allocation already claimed for this agent.");
    const vaultBalance = await vault.getBalance(agentId);
    console.log(`   Current vault balance: ${ethers.formatEther(vaultBalance)} ETH\n`);
    console.log("✅ No action needed.\n");
    return;
  }

  const allocation = await vault.allocationPerTeam();
  console.log(`   Allocation per team: ${ethers.formatEther(allocation)} ETH\n`);

  // Step 6: Estimate gas and print summary
  console.log("========================================");
  console.log("  ICE CREAM VAULT CLAIM SUMMARY");
  console.log("========================================");
  console.log(`  Operator wallet:   ${operatorAddress}`);
  console.log(`  Agent ID:          ${agentId.toString()}`);
  console.log(`  Network:           Ethereum Sepolia (Chain ID: 11155111)`);
  console.log(`  Contract:          ${process.env.HACKATHON_VAULT_ADDRESS}`);
  console.log(`  Amount to claim:   ${ethers.formatEther(allocation)} ETH`);

  let estimatedGas;
  try {
    estimatedGas = await vault.claimAllocation.estimateGas(agentId);
    console.log(`  Estimated gas:     ${estimatedGas.toString()} units`);
  } catch (err) {
    console.log(`  Estimated gas:     Unable to estimate (will use default)`);
    estimatedGas = 200000n;
  }

  console.log("========================================");
  console.log("  Submitting transaction...\n");

  // Step 7: Submit transaction
  const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer

  const tx = await vault.claimAllocation(
    agentId,
    { gasLimit }
  );

  console.log(`⏳ Transaction submitted: ${tx.hash}`);
  console.log(`   Track on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}\n`);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

  // Step 8: Check new balance
  const newBalance = await vault.getBalance(agentId);
  console.log(`💰 Vault balance for Agent ${agentId.toString()}: ${ethers.formatEther(newBalance)} ETH\n`);

  // Step 9: Save results
  const result = {
    agentId: agentId.toString(),
    operatorWallet: operatorAddress,
    claimedAt: new Date().toISOString(),
    transactionHash: tx.hash,
    amountClaimed: ethers.formatEther(allocation),
    vaultBalance: ethers.formatEther(newBalance),
    network: "sepolia",
    contractAddress: process.env.HACKATHON_VAULT_ADDRESS
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "..", "claim-receipt.json");

  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

  // Step 10: Print success output
  console.log("========================================");
  console.log("  CLAIM SUCCESSFUL 🎉");
  console.log("========================================");
  console.log(`  Agent ID:          ${agentId.toString()}`);
  console.log(`  Amount Claimed:    ${ethers.formatEther(allocation)} ETH`);
  console.log(`  Transaction:       https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log("========================================");
  console.log("  Next steps:");
  console.log("  1. Your agent now has funds to trade!");
  console.log("  2. Run: npm run trade  (to submit a trade intent)");
  console.log("========================================\n");

  console.log(`💾 Receipt saved to: ${outputPath}\n`);
}

// Run with error handling
main().catch((error) => {
  console.error("\n❌ CLAIM FAILED\n");

  // Handle specific error types
  if (error.code === "INSUFFICIENT_FUNDS") {
    console.error("Error: Insufficient funds for gas");
    console.error("Get Sepolia ETH from https://sepoliafaucet.com\n");
  } else if (error.code === "CALL_EXCEPTION") {
    console.error("Error: Transaction failed — the allocation may already be claimed.");
    console.error("Check Etherscan for details.\n");
  } else if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
    console.error("Error: Network connection failed");
    console.error("Check your SEPOLIA_RPC_URL and internet connection.\n");
  } else {
    console.error("Error details:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
  }

  process.exit(1);
});
