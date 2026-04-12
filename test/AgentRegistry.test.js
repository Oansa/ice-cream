/**
 * Test suite for AgentRegistry contract
 * Run with: npx hardhat test
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry", function () {
  let AgentRegistry;
  let registry;
  let owner;
  let user1;
  let user2;

  const deploymentFee = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await registry.name()).to.equal("IceCream Trading Agent");
      expect(await registry.symbol()).to.equal("ICECREAM");
    });

    it("Should set the correct deployment fee", async function () {
      expect(await registry.deploymentFee()).to.equal(deploymentFee);
    });

    it("Should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe("Agent Deployment", function () {
    it("Should deploy a new agent", async function () {
      const tx = await registry.connect(user1).deployAgent(
        "Test Agent",
        0, // SPOT
        "ETH/USD",
        "PRICE_DROP_5PCT",
        ethers.parseEther("0.1"),
        500, // 5% in basis points
        "",
        { value: deploymentFee }
      );

      const receipt = await tx.wait();

      // Check event emitted
      const event = receipt.logs.find(
        (log) => registry.interface.parseLog(log)?.name === "AgentDeployed"
      );
      expect(event).to.not.be.undefined;

      // Check token minted
      expect(await registry.balanceOf(user1.address)).to.equal(1);
      expect(await registry.totalSupply()).to.equal(1);
    });

    it("Should fail with insufficient fee", async function () {
      await expect(
        registry.connect(user1).deployAgent(
          "Test Agent",
          0,
          "ETH/USD",
          "PRICE_DROP_5PCT",
          ethers.parseEther("0.1"),
          500,
          "",
          { value: 0 }
        )
      ).to.be.revertedWith("Insufficient deployment fee");
    });

    it("Should fail without name", async function () {
      await expect(
        registry.connect(user1).deployAgent(
          "",
          0,
          "ETH/USD",
          "PRICE_DROP_5PCT",
          ethers.parseEther("0.1"),
          500,
          "",
          { value: deploymentFee }
        )
      ).to.be.revertedWith("Name required");
    });

    it("Should track user agents", async function () {
      await registry.connect(user1).deployAgent(
        "Agent 1",
        0,
        "ETH/USD",
        "PRICE_DROP_5PCT",
        ethers.parseEther("0.1"),
        500,
        "",
        { value: deploymentFee }
      );

      await registry.connect(user1).deployAgent(
        "Agent 2",
        1,
        "BTC/USD",
        "INTERVAL_24H",
        ethers.parseEther("0.05"),
        1000,
        "",
        { value: deploymentFee }
      );

      const userAgents = await registry.getUserAgents(user1.address);
      expect(userAgents.length).to.equal(2);
    });

    it("Should enforce max agents per user", async function () {
      // Deploy 10 agents (default max)
      for (let i = 0; i < 10; i++) {
        await registry.connect(user1).deployAgent(
          `Agent ${i}`,
          0,
          "ETH/USD",
          "PRICE_DROP_5PCT",
          ethers.parseEther("0.01"),
          500,
          "",
          { value: deploymentFee }
        );
      }

      // 11th should fail
      await expect(
        registry.connect(user1).deployAgent(
          "Agent 11",
          0,
          "ETH/USD",
          "PRICE_DROP_5PCT",
          ethers.parseEther("0.01"),
          500,
          "",
          { value: deploymentFee }
        )
      ).to.be.revertedWith("Max agents reached");
    });
  });

  describe("Agent Management", function () {
    let tokenId;
    let agentContract;

    beforeEach(async function () {
      const tx = await registry.connect(user1).deployAgent(
        "Test Agent",
        0,
        "ETH/USD",
        "PRICE_DROP_5PCT",
        ethers.parseEther("0.1"),
        500,
        "",
        { value: deploymentFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => registry.interface.parseLog(log)?.name === "AgentDeployed"
      );
      const parsed = registry.interface.parseLog(event);
      tokenId = parsed.args.tokenId;
      agentContract = parsed.args.agentContract;
    });

    it("Should toggle agent status", async function () {
      await registry.connect(user1).toggleAgentStatus(tokenId);

      const info = await registry.getAgentInfo(tokenId);
      expect(info.isActive).to.be.false;
    });

    it("Should fail to toggle if not owner", async function () {
      await expect(
        registry.connect(user2).toggleAgentStatus(tokenId)
      ).to.be.revertedWith("Not agent owner");
    });

    it("Should return correct agent info", async function () {
      const info = await registry.getAgentInfo(tokenId);

      expect(info.name).to.equal("Test Agent");
      expect(info.strategyType).to.equal(0); // SPOT
      expect(info.tokenPair).to.equal("ETH/USD");
      expect(info.trigger).to.equal("PRICE_DROP_5PCT");
      expect(info.isActive).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update deployment fee", async function () {
      const newFee = ethers.parseEther("0.002");
      await registry.setDeploymentFee(newFee);
      expect(await registry.deploymentFee()).to.equal(newFee);
    });

    it("Should allow owner to update max agents", async function () {
      await registry.setMaxAgentsPerUser(20);
      expect(await registry.maxAgentsPerUser()).to.equal(20);
    });

    it("Should allow owner to withdraw fees", async function () {
      // Deploy an agent first to collect fees
      await registry.connect(user1).deployAgent(
        "Test Agent",
        0,
        "ETH/USD",
        "PRICE_DROP_5PCT",
        ethers.parseEther("0.1"),
        500,
        "",
        { value: deploymentFee }
      );

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await registry.withdrawFees();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      // Should have received the fee (minus gas)
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(
        registry.connect(user1).setDeploymentFee(ethers.parseEther("0.002"))
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC721 Functionality", function () {
    beforeEach(async function () {
      await registry.connect(user1).deployAgent(
        "Test Agent",
        0,
        "ETH/USD",
        "PRICE_DROP_5PCT",
        ethers.parseEther("0.1"),
        500,
        "",
        { value: deploymentFee }
      );
    });

    it("Should return correct token URI", async function () {
      const tokenURI = await registry.tokenURI(1);
      expect(tokenURI).to.include("data:application/json;base64");
    });

    it("Should allow transferring NFT", async function () {
      await registry
        .connect(user1)
        .transferFrom(user1.address, user2.address, 1);

      expect(await registry.ownerOf(1)).to.equal(user2.address);
    });
  });
});

describe("TradingAgent", function () {
  let TradingAgent;
  let agent;
  let owner;
  let executor;

  beforeEach(async function () {
    [owner, executor] = await ethers.getSigners();

    // Deploy TradingAgent directly for testing
    TradingAgent = await ethers.getContractFactory("TradingAgent");
    agent = await TradingAgent.deploy(
      1, // tokenId
      owner.address,
      "Test Agent",
      0, // SPOT
      "ETH/USD",
      "PRICE_DROP_5PCT",
      ethers.parseEther("0.1"),
      500,
      "{\"nodes\":[],\"edges\":[]}"
    );
    await agent.waitForDeployment();
  });

  describe("Configuration", function () {
    it("Should have correct initial values", async function () {
      expect(await agent.name()).to.equal("Test Agent");
      expect(await agent.tokenPair()).to.equal("ETH/USD");
      expect(await agent.isActive()).to.be.true;
    });

    it("Should authorize executor", async function () {
      await agent.connect(owner).authorizeExecutor(executor.address);
      expect(await agent.authorizedExecutors(executor.address)).to.be.true;
    });

    it("Should revoke executor", async function () {
      await agent.connect(owner).authorizeExecutor(executor.address);
      await agent.connect(owner).revokeExecutor(executor.address);
      expect(await agent.authorizedExecutors(executor.address)).to.be.false;
    });
  });

  describe("Trade Execution", function () {
    beforeEach(async function () {
      await agent.connect(owner).authorizeExecutor(executor.address);
    });

    it("Should execute a BUY trade", async function () {
      const tx = await agent
        .connect(executor)
        .executeTrade(0, ethers.parseEther("0.1"), ethers.parseEther("3500"), "tx1");

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => agent.interface.parseLog(log)?.name === "TradeExecuted"
      );

      expect(event).to.not.be.undefined;

      const position = await agent.getPositionInfo();
      expect(position.isOpen).to.be.true;
      expect(position.amount).to.equal(ethers.parseEther("0.1"));
    });

    it("Should execute a SELL trade", async function () {
      // First BUY
      await agent
        .connect(executor)
        .executeTrade(0, ethers.parseEther("0.1"), ethers.parseEther("3500"), "tx1");

      // Then SELL
      const tx = await agent
        .connect(executor)
        .executeTrade(1, ethers.parseEther("0.1"), ethers.parseEther("3600"), "tx2");

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => agent.interface.parseLog(log)?.name === "TradeExecuted"
      );

      expect(event).to.not.be.undefined;

      const position = await agent.getPositionInfo();
      expect(position.isOpen).to.be.false;
    });

    it("Should fail trade execution by non-executor", async function () {
      const [, , nonExecutor] = await ethers.getSigners();
      await expect(
        agent
          .connect(nonExecutor)
          .executeTrade(0, ethers.parseEther("0.1"), ethers.parseEther("3500"), "tx1")
      ).to.be.revertedWith("Not authorized executor");
    });
  });
});
