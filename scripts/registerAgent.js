#!/usr/bin/env node
/**
 * Ice Cream Agent Registration Script
 * Registers the AI trading agent on the shared AgentRegistry contract (Sepolia)
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// AgentRegistry ABI
const AGENT_REGISTRY_ABI = [
  "function register(address agentWallet, string name, string description, string[] capabilities, string agentURI) external returns (uint256 agentId)",
  "function isRegistered(uint256 agentId) external view returns (bool)",
  "function getAgent(uint256 agentId) external view returns (tuple(address operatorWallet, address agentWallet, string name, string description, string[] capabilities, uint256 registeredAt, bool active))",
  "event AgentRegistered(uint256 indexed agentId, address indexed operatorWallet, address indexed agentWallet)"
];

// Validation: Check required environment variables
function validateEnv() {
  const required = [
    "OPERATOR_PRIVATE_KEY",
    "AGENT_WALLET_ADDRESS",
    "AGENT_REGISTRY_ADDRESS",
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

// Main registration function
async function main() {
  console.log("\n🍦 Ice Cream Agent Registration\n");

  // Step 1: Validate environment
  validateEnv();

  // Step 2: Set up provider and wallets
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);

  // Step 3: Connect to AgentRegistry
  const registry = new ethers.Contract(
    process.env.AGENT_REGISTRY_ADDRESS,
    AGENT_REGISTRY_ABI,
    operatorWallet
  );

  // Step 4: Pre-flight checks
  console.log("📋 Pre-flight checks...\n");

  const operatorAddress = await operatorWallet.getAddress();
  const balance = await provider.getBalance(operatorAddress);
  const balanceEth = ethers.formatEther(balance);

  console.log(`   Operator wallet:   ${operatorAddress}`);
  console.log(`   Balance:           ${balanceEth} ETH\n`);

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  WARNING: Low balance — you may not have enough ETH for gas.");
    console.warn("   Get Sepolia ETH from https://sepoliafaucet.com\n");
  }

  const agentWallet = process.env.AGENT_WALLET_ADDRESS;
  console.log(`   Agent wallet:      ${agentWallet}`);
  console.log(`   Connecting to AgentRegistry at ${process.env.AGENT_REGISTRY_ADDRESS}...\n`);

  // Step 5: Build registration payload
  const name = process.env.AGENT_NAME || "Ice Cream Agent";
  const description = "A no-code AI-powered trading agent built on Ice Cream — the platform that lets anyone deploy blockchain trading agents through natural language chat. Powered by Claude AI.";
  const capabilities = ["trading", "eip712-signing", "spot-trading", "sniper-trading", "dca", "risk-management", "claude-ai"];
  const agentURI = "https://icecream.finance/agent-metadata.json";

  // Step 6: Estimate gas and print summary
  console.log("========================================");
  console.log("  ICE CREAM AGENT REGISTRATION SUMMARY");
  console.log("========================================");
  console.log(`  Operator wallet:   ${operatorAddress}`);
  console.log(`  Agent wallet:      ${agentWallet}`);
  console.log(`  Agent name:        ${name}`);
  console.log(`  Capabilities:      ${capabilities.join(", ")}`);
  console.log(`  Network:           Ethereum Sepolia (Chain ID: 11155111)`);
  console.log(`  Contract:          ${process.env.AGENT_REGISTRY_ADDRESS}`);

  let estimatedGas;
  try {
    estimatedGas = await registry.register.estimateGas(
      agentWallet,
      name,
      description,
      capabilities,
      agentURI
    );
    console.log(`  Estimated gas:     ${estimatedGas.toString()} units`);
  } catch (err) {
    console.log(`  Estimated gas:     Unable to estimate (will use default)`);
    estimatedGas = 500000n;
  }

  console.log("========================================");
  console.log("  Submitting transaction...\n");

  // Step 7: Submit transaction
  const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer

  const tx = await registry.register(
    agentWallet,
    name,
    description,
    capabilities,
    agentURI,
    { gasLimit }
  );

  console.log(`⏳ Transaction submitted: ${tx.hash}`);
  console.log(`   Track on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}\n`);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

  // Step 8: Parse agentId from receipt logs
  let agentId = null;
  const iface = new ethers.Interface(AGENT_REGISTRY_ABI);

  for (const log of receipt.logs) {
    // Only check logs from the AgentRegistry contract
    if (log.address.toLowerCase() !== process.env.AGENT_REGISTRY_ADDRESS.toLowerCase()) {
      continue;
    }

    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "AgentRegistered") {
        agentId = parsed.args.agentId;
        break;
      }
    } catch (e) {
      // Skip logs that don't match
    }

    // Fallback: manually check event signature hash
    // AgentRegistered(uint256 indexed agentId, address indexed operatorWallet, address indexed agentWallet)
    // keccak256("AgentRegistered(uint256,address,address)") = 0xcc66f27f523818ed7eebbbb8e3cb65a0bb2e0d72041c113764747fa2c4fac07b
    const AGENT_REGISTERED_TOPIC = "0xcc66f27f523818ed7eebbbb8e3cb65a0bb2e0d72041c113764747fa2c4fac07b";
    if (log.topics[0] === AGENT_REGISTERED_TOPIC) {
      // Topics: [eventSig, agentId, operatorWallet, agentWallet]
      agentId = BigInt(log.topics[1]);
      break;
    }
  }

  if (!agentId) {
    console.error("\nDebug: All receipt logs:");
    console.error(JSON.stringify(receipt.logs, null, 2));
    throw new Error("Failed to parse AgentRegistered event from transaction receipt");
  }

  // Step 9: Save results to agent-id.json
  const result = {
    agentId: agentId.toString(),
    operatorWallet: operatorAddress,
    agentWallet: agentWallet,
    registeredAt: new Date().toISOString(),
    transactionHash: tx.hash,
    network: "sepolia",
    contractAddress: process.env.AGENT_REGISTRY_ADDRESS
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "..", "agent-id.json");

  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

  // Step 10: Print success output
  console.log("========================================");
  console.log("  REGISTRATION SUCCESSFUL 🎉");
  console.log("========================================");
  console.log(`  Agent ID:          ${agentId.toString()}`);
  console.log(`  Transaction:       https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log(`  Agent on Etherscan: https://sepolia.etherscan.io/address/${agentWallet}`);
  console.log("========================================");
  console.log("  Next steps:");
  console.log(`  1. Add AGENT_ID=${agentId.toString()} to your .env file`);
  console.log("  2. Run: npm run claim");
  console.log("  3. Your agent is ready to trade!");
  console.log("========================================\n");

  console.log(`💾 Results saved to: ${outputPath}\n`);
}

// Run with error handling
main().catch((error) => {
  console.error("\n❌ REGISTRATION FAILED\n");

  // Handle specific error types
  if (error.code === "INSUFFICIENT_FUNDS") {
    console.error("Error: Insufficient funds for gas");
    console.error("Get Sepolia ETH from https://sepoliafaucet.com\n");
  } else if (error.code === "CALL_EXCEPTION") {
    console.error("Error: Transaction failed — the agent wallet may already be registered.");
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
