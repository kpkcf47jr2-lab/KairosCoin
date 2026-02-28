const { expect } = require("chai");
const { ethers } = require("hardhat");

// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Exchange — Contract Tests
//  Tests: FeeModule, KairosRouter, Adapters
// ═══════════════════════════════════════════════════════════════════════════════

describe("Kairos Exchange", function () {
  let owner, user, treasury, guardian;
  let feeModule, router;
  let mockKairos, mockTokenA, mockTokenB;

  // ── Deploy mock ERC20 ──
  async function deployMockToken(name, symbol, supply) {
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy(name, symbol, supply);
    await token.waitForDeployment();
    return token;
  }

  beforeEach(async function () {
    [owner, user, treasury, guardian] = await ethers.getSigners();

    // Deploy mock tokens
    const supply = ethers.parseEther("1000000");
    mockKairos = await deployMockToken("KAIROS", "KAIROS", supply);
    mockTokenA = await deployMockToken("Token A", "TKA", supply);
    mockTokenB = await deployMockToken("Token B", "TKB", supply);

    // Deploy FeeModule
    const FeeModule = await ethers.getContractFactory("FeeModule");
    feeModule = await FeeModule.deploy(
      treasury.address,
      await mockKairos.getAddress(),
      owner.address
    );
    await feeModule.waitForDeployment();

    // Deploy KairosRouter
    const KairosRouter = await ethers.getContractFactory("KairosRouter");
    router = await KairosRouter.deploy(
      await feeModule.getAddress(),
      ethers.ZeroAddress, // WETH placeholder
      owner.address
    );
    await router.waitForDeployment();
  });

  // ═══════════════════════════════════════════════
  //  FeeModule Tests
  // ═══════════════════════════════════════════════

  describe("FeeModule", function () {
    it("should deploy with correct initial values", async function () {
      expect(await feeModule.baseFee()).to.equal(15);
      expect(await feeModule.kairosDiscount()).to.equal(5000);
      expect(await feeModule.kairosMinBalance()).to.equal(ethers.parseEther("100"));
      expect(await feeModule.treasury()).to.equal(treasury.address);
    });

    it("should calculate base fee correctly (0.15%)", async function () {
      const amount = ethers.parseEther("1000");
      const [feeAmount, netAmount] = await feeModule.calculateFee(amount, user.address);

      // 1000 * 15 / 10000 = 1.5
      expect(feeAmount).to.equal(ethers.parseEther("1.5"));
      expect(netAmount).to.equal(ethers.parseEther("998.5"));
    });

    it("should apply KAIROS holder discount (50% off fees)", async function () {
      // Give user 100 KAIROS tokens
      await mockKairos.transfer(user.address, ethers.parseEther("100"));

      const amount = ethers.parseEther("1000");
      const [feeAmount, netAmount] = await feeModule.calculateFee(amount, user.address);

      // 1000 * (15 * 5000 / 10000) / 10000 = 1000 * 7.5 / 10000 = 0.75
      // Actually: effectiveFee = 15 * (10000 - 5000) / 10000 = 7 (integer math)
      // feeAmount = 1000e18 * 7 / 10000 = 0.7e18
      const effectiveFee = 15n * (10000n - 5000n) / 10000n; // 7
      const expectedFee = ethers.parseEther("1000") * effectiveFee / 10000n;
      expect(feeAmount).to.equal(expectedFee);
      expect(netAmount).to.equal(amount - expectedFee);
    });

    it("should exempt fee-exempt addresses", async function () {
      await feeModule.setFeeExempt(user.address, true);

      const amount = ethers.parseEther("1000");
      const [feeAmount, netAmount] = await feeModule.calculateFee(amount, user.address);

      expect(feeAmount).to.equal(0);
      expect(netAmount).to.equal(amount);
    });

    it("should allow fee manager to update base fee", async function () {
      await feeModule.setBaseFee(20);
      expect(await feeModule.baseFee()).to.equal(20);
    });

    it("should reject fee above MAX_FEE", async function () {
      await expect(feeModule.setBaseFee(101)).to.be.revertedWithCustomError(
        feeModule,
        "FeeTooHigh"
      );
    });

    it("should allow admin to update treasury", async function () {
      await feeModule.setTreasury(user.address);
      expect(await feeModule.treasury()).to.equal(user.address);
    });

    it("should reject zero address treasury", async function () {
      await expect(feeModule.setTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        feeModule,
        "ZeroAddress"
      );
    });

    it("should be pausable by admin", async function () {
      await feeModule.pause();
      expect(await feeModule.paused()).to.be.true;
      await feeModule.unpause();
      expect(await feeModule.paused()).to.be.false;
    });

    it("should reject non-admin operations", async function () {
      await expect(
        feeModule.connect(user).setBaseFee(20)
      ).to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════
  //  KairosRouter Tests
  // ═══════════════════════════════════════════════

  describe("KairosRouter", function () {
    it("should deploy with correct roles", async function () {
      const ADMIN = await router.DEFAULT_ADMIN_ROLE();
      const GUARDIAN = await router.GUARDIAN_ROLE();
      const ADAPTER_MGR = await router.ADAPTER_MANAGER_ROLE();

      expect(await router.hasRole(ADMIN, owner.address)).to.be.true;
      expect(await router.hasRole(GUARDIAN, owner.address)).to.be.true;
      expect(await router.hasRole(ADAPTER_MGR, owner.address)).to.be.true;
    });

    it("should register adapter", async function () {
      const MockAdapter = await ethers.getContractFactory("MockDEXAdapter");
      const adapter = await MockAdapter.deploy("TestDEX");
      await adapter.waitForDeployment();

      await router.registerAdapter(await adapter.getAddress());
      expect(await router.getAdapterCount()).to.equal(1);
    });

    it("should toggle adapter on/off", async function () {
      const MockAdapter = await ethers.getContractFactory("MockDEXAdapter");
      const adapter = await MockAdapter.deploy("TestDEX");
      await adapter.waitForDeployment();

      await router.registerAdapter(await adapter.getAddress());

      const id = ethers.keccak256(ethers.toUtf8Bytes("TestDEX"));
      expect(await router.adapterEnabled(id)).to.be.true;

      await router.toggleAdapter(id, false);
      expect(await router.adapterEnabled(id)).to.be.false;
    });

    it("should emergency pause", async function () {
      await router.emergencyPause();
      expect(await router.paused()).to.be.true;
    });

    it("should update fee module", async function () {
      const newFeeAddr = user.address; // just testing the setter
      await router.setFeeModule(newFeeAddr);
      expect(await router.feeModule()).to.equal(newFeeAddr);
    });

    it("should emergency withdraw ERC20", async function () {
      // Send some tokens to router
      const amount = ethers.parseEther("100");
      await mockTokenA.transfer(await router.getAddress(), amount);

      await router.emergencyWithdraw(
        await mockTokenA.getAddress(),
        amount,
        owner.address
      );

      expect(await mockTokenA.balanceOf(owner.address)).to.equal(ethers.parseEther("1000000"));
    });

    it("should reject non-admin adapter registration", async function () {
      const MockAdapter = await ethers.getContractFactory("MockDEXAdapter");
      const adapter = await MockAdapter.deploy("TestDEX");
      await adapter.waitForDeployment();

      await expect(
        router.connect(user).registerAdapter(await adapter.getAddress())
      ).to.be.reverted;
    });
  });
});
