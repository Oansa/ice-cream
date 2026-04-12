/**
 * Script to deploy an agent via the AgentRegistry contract
 * Usage: node scripts/deploy-agent.js --name "My Agent" --strategy SPOT --pair ETH/USD --trigger PRICE_DROP_5PCT --size 100 --stoploss 5
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Parse command line arguments
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs();

  // Default values
  const name = args.name || "Test Agent";
  const strategy = args.strategy || "SPOT";
  const pair = args.pair || "ETH/USD";
  const trigger = args.trigger || "PRICE_DROP_5PCT";
  const size = args.size || "0.1"; // in ETH
  const stoploss = args.stoploss || "5";

  console.log("========================================");
  console.log("  Deploy New Trading Agent");
  console.log(`  Network: ${network.name}`);
  console.log("========================================\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for network: ${network.name}`);
    console.error(`   Run: npx hardhat run scripts/deploy.js --network ${network.name}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const registryAddress = deployment.registry;

  console.log(`Registry contract: ${registryAddress}\n`);

  // Connect to registry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(registryAddress);

  // Check deployment fee
  const deploymentFee = await registry.deploymentFee();
  console.log(`Deployment fee: ${ethers.formatEther(deploymentFee)} ETH`);

  // Strategy type mapping
  const strategyTypes = {
    SPOT: 0,
    DCA: 1,
    SNIPER: 2,
    MARGIN: 3,
    MEME: 4,
    ARBITRAGE: 5,
    VISUAL: 6,
  };

  const strategyType = strategyTypes[strategy.toUpperCase()];
  if (strategyType === undefined) {
    console.error(`❌ Invalid strategy type: ${strategy}`);
    console.error(`   Valid options: ${Object.keys(strategyTypes).join(", ")}`);
    process.exit(1);
  }

  // Convert position size to wei
  const positionSize = ethers.parseEther(size.toString());

  // Convert stop loss to percentage basis points
  const stopLossPct = parseInt(stoploss) * 100; // e.g., 5% = 500 basis points

  console.log("\nAgent Configuration:");
  console.log(`  Name: ${name}`);
  console.log(`  Strategy: ${strategy} (${strategyType})`);
  console.log(`  Token Pair: ${pair}`);
  console.log(`  Trigger: ${trigger}`);
  console.log(`  Position Size: ${size} ETH (${positionSize} wei)`);
  console.log(`  Stop Loss: ${stoploss}% (${stopLossPct} basis points)\n`);

  // Deploy agent
  console.log("Deploying agent to blockchain...");
  const tx = await registry.deployAgent(
    name,
    strategyType,
    pair,
    trigger,
    positionSize,
    stopLossPct,
    "", // strategyGraphJSON - empty for simple agents
    { value: deploymentFee }
  );

  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Waiting for confirmation...\n");

  const receipt = await tx.wait();

  // Parse event logs
  const deployEvent = receipt.logs.find(
    (log) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed?.name === "AgentDeployed";
      } catch {
        return false;
      }
    }
  );

  if (deployEvent) {
    const parsed = registry.interface.parseLog(deployEvent);
    const tokenId = parsed.args.tokenId.toString();
    const agentContract = parsed.args.agentContract;

    console.log("✅ Agent deployed successfully!\n");
    console.log("Agent Details:");
    console.log(`  Token ID: ${tokenId}`);
    console.log(`  Agent Contract: ${agentContract}`);
    console.log(`  Transaction: ${tx.hash}`);

    if (network.name === "sepolia") {
      console.log(`\n🔍 View on Sepolia Explorer:`);
      console.log(`   https://sepolia.etherscan.io/token/${registryAddress}?a=${tokenId}`);
      console.log(`   https://sepolia.etherscan.io/address/${agentContract}`);
    }

    // Save agent info
    const agentsDir = path.join(deploymentsDir, "agents");
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    const agentInfo = {
      tokenId,
      agentContract,
      owner: deployer.address,
      name,
      strategy,
      pair,
      trigger,
      positionSize: size,
      stopLoss: stoploss,
      transactionHash: tx.hash,
      deployedAt: new Date().toISOString(),
    };

    const agentFile = path.join(agentsDir, `${tokenId}.json`);
    fs.writeFileSync(agentFile, JSON.stringify(agentInfo, null, 2));
    console.log(`\n💾 Agent info saved to: ${agentFile}`);

    return agentInfo;
  } else {
    console.log("✅ Transaction confirmed but could not parse event");
    console.log(`   Hash: ${tx.hash}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Failed to deploy agent:");
    console.error(error);
    process.exit(1);
  });
