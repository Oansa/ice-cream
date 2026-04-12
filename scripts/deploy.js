/**
 * Hardhat deployment script for IceCream Trading Agent contracts
 * Deploys to Sepolia testnet
 * ESM version compatible with "type": "module"
 */

import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("========================================");
  console.log("  IceCream Agent Deployment");
  console.log(`  Network: ${hre.network.name}`);
  console.log("========================================\n");

  // Get deployer account
  const signers = await hre.ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    console.error("❌ ERROR: No deployer account found!");
    console.error("\nYou need to configure your private key:");
    console.error("1. Create a .env file in the project root");
    console.error("2. Add: PRIVATE_KEY=your_metamask_private_key");
    console.error("3. Make sure you're using the Sepolia testnet account");
    console.error("\nTo get your private key from MetaMask:");
    console.error("1. Open MetaMask");
    console.error("2. Switch to Sepolia network");
    console.error("3. Click account icon → Details");
    console.error("4. Click 'Export Private Key'");
    console.error("5. Enter password and copy the key");
    console.error("6. Paste into .env as PRIVATE_KEY=0x...");
    console.error("\n⚠️  NEVER share your private key!");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log(`Deploying with account: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Check balance
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer account has 0 ETH!");
    console.error("\nYou need Sepolia testnet ETH to pay for deployment:");
    console.error("1. Go to https://sepoliafaucet.com");
    console.error("2. Or https://www.alchemy.com/faucets/ethereum");
    console.error("3. Enter your address: " + deployer.address);
    console.error("4. Get free test ETH (0.5-1.0 recommended)");
    process.exit(1);
  }

  // Check if we're on the right network
  if (hre.network.name !== "sepolia" && hre.network.name !== "hardhat") {
    console.warn(`\n⚠️  Warning: You are deploying to ${hre.network.name}, not Sepolia!`);
    console.warn("   Make sure this is intentional.\n");
  }

  // Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log(`✅ AgentRegistry deployed to: ${registryAddress}`);
  console.log(`   Transaction hash: ${registry.deploymentTransaction()?.hash || 'N/A'}\n`);

  // Wait for a few block confirmations on Sepolia
  if (hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations...");
    await registry.deploymentTransaction()?.wait(3);
    console.log("✅ Confirmed\n");
  }

  // Get deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    registry: registryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentRegistry: registryAddress,
    },
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);

  // Also create/update environment file
  const envPath = path.join(__dirname, "..", ".env.local");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add NEXT_PUBLIC_AGENT_REGISTRY
  const registryLine = `NEXT_PUBLIC_AGENT_REGISTRY=${registryAddress}`;
  if (envContent.includes("NEXT_PUBLIC_AGENT_REGISTRY=")) {
    envContent = envContent.replace(/NEXT_PUBLIC_AGENT_REGISTRY=.*/g, registryLine);
  } else {
    envContent += `\n${registryLine}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Updated .env.local with contract address\n`);

  // Verification instructions
  console.log("========================================");
  console.log("  Deployment Complete!");
  console.log("========================================");
  console.log(`\nContract Address: ${registryAddress}`);
  console.log(`Network: ${hre.network.name}`);

  if (hre.network.name === "sepolia") {
    console.log(`\n🔍 Verify on Sepolia Etherscan:`);
    console.log(`   https://sepolia.etherscan.io/address/${registryAddress}`);
    console.log(`\n📋 To verify contract source code:`);
    console.log(`   npx hardhat verify --network sepolia ${registryAddress}`);
  }

  console.log(`\n📚 Next steps:`);
  console.log(`   1. Fund your agent wallet with Sepolia ETH`);
  console.log(`   2. Update your frontend .env with the contract address`);
  console.log(`   3. Deploy agents using the UI or scripts`);

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => {
    if (typeof Bun !== 'undefined') {
      Bun.exit(0);
    } else {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    if (typeof Bun !== 'undefined') {
      Bun.exit(1);
    } else {
      process.exit(1);
    }
  });

