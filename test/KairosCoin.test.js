// test/KairosCoin.test.js
// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin (KAIROS) — Complete Test Suite
//  Tests every function, modifier, event, and edge case.
//  Includes Fee System tests.
// ═══════════════════════════════════════════════════════════════════════════════

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("KairosCoin (KAIROS)", function () {
  // ═════════════════════════════════════════════════════════════════════════
  //                           FIXTURES
  // ═════════════════════════════════════════════════════════════════════════

  async function deployFixture() {
    const [admin, reserve, user1, user2, user3, attacker] = await ethers.getSigners();

    const KairosCoin = await ethers.getContractFactory("KairosCoin");
    const kairos = await KairosCoin.deploy(admin.address, reserve.address);
    await kairos.waitForDeployment();

    const INITIAL_SUPPLY = ethers.parseEther("10000000000"); // 10B
    const FEE_BPS = 8n;
    const FEE_DENOMINATOR = 10_000n;

    return { kairos, admin, reserve, user1, user2, user3, attacker, INITIAL_SUPPLY, FEE_BPS, FEE_DENOMINATOR };
  }

  // Helper: calculate expected fee
  function calcFee(amount, bps = 8n, denominator = 10_000n) {
    return (amount * bps) / denominator;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //                        1. DEPLOYMENT
  // ═════════════════════════════════════════════════════════════════════════

  describe("1. Deployment", function () {
    it("Should set the correct token name", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.name()).to.equal("Kairos Coin");
    });

    it("Should set the correct symbol", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.symbol()).to.equal("KAIROS");
    });

    it("Should set 18 decimals", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.decimals()).to.equal(18);
    });

    it("Should mint 10,000,000,000 KAIROS to admin", async function () {
      const { kairos, admin, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      expect(await kairos.balanceOf(admin.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set totalSupply to 10B", async function () {
      const { kairos, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should set admin as owner", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      expect(await kairos.owner()).to.equal(admin.address);
    });

    it("Should set reserve wallet correctly", async function () {
      const { kairos, reserve } = await loadFixture(deployFixture);
      expect(await kairos.reserveWallet()).to.equal(reserve.address);
    });

    it("Should set default feeBps to 8", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.feeBps()).to.equal(8);
    });

    it("Should mark admin as fee-exempt", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      expect(await kairos.feeExempt(admin.address)).to.be.true;
    });

    it("Should mark reserve wallet as fee-exempt", async function () {
      const { kairos, reserve } = await loadFixture(deployFixture);
      expect(await kairos.feeExempt(reserve.address)).to.be.true;
    });

    it("Should start with totalMinted = 0", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.totalMinted()).to.equal(0);
    });

    it("Should start with totalBurned = 0", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.totalBurned()).to.equal(0);
    });

    it("Should start with totalFeesCollected = 0", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.totalFeesCollected()).to.equal(0);
    });

    it("Should revert if admin wallet is zero address", async function () {
      const [, reserve] = await ethers.getSigners();
      const KairosCoin = await ethers.getContractFactory("KairosCoin");
      await expect(KairosCoin.deploy(ethers.ZeroAddress, reserve.address))
        .to.be.revertedWithCustomError(KairosCoin, "OwnableInvalidOwner");
    });

    it("Should revert if reserve wallet is zero address", async function () {
      const [admin] = await ethers.getSigners();
      const KairosCoin = await ethers.getContractFactory("KairosCoin");
      await expect(KairosCoin.deploy(admin.address, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(KairosCoin, "ZeroAddress");
    });

    it("Should set INITIAL_SUPPLY constant correctly", async function () {
      const { kairos } = await loadFixture(deployFixture);
      expect(await kairos.INITIAL_SUPPLY()).to.equal(ethers.parseEther("10000000000"));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                        2. ERC-20 STANDARD
  // ═════════════════════════════════════════════════════════════════════════

  describe("2. ERC-20 Standard Transfers", function () {
    it("Should transfer tokens (fee-exempt admin sends)", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await kairos.connect(admin).transfer(user1.address, amount);
      expect(await kairos.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit Transfer event on transfer", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await expect(kairos.connect(admin).transfer(user1.address, amount))
        .to.emit(kairos, "Transfer")
        .withArgs(admin.address, user1.address, amount);
    });

    it("Should approve and transferFrom correctly", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("2000");

      await kairos.connect(admin).approve(user1.address, amount);
      expect(await kairos.allowance(admin.address, user1.address)).to.equal(amount);

      await kairos.connect(user1).transferFrom(admin.address, user2.address, amount);
      expect(await kairos.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should emit Approval event", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(kairos.connect(admin).approve(user1.address, amount))
        .to.emit(kairos, "Approval")
        .withArgs(admin.address, user1.address, amount);
    });

    it("Should fail transfer if insufficient balance", async function () {
      const { kairos, user1, user2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1");

      await expect(
        kairos.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                        3. MINT FUNCTION
  // ═════════════════════════════════════════════════════════════════════════

  describe("3. Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("5000");

      await kairos.connect(admin).mint(user1.address, amount);
      expect(await kairos.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should update totalMinted on mint", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("5000");

      await kairos.connect(admin).mint(user1.address, amount);
      expect(await kairos.totalMinted()).to.equal(amount);
    });

    it("Should increase totalSupply on mint", async function () {
      const { kairos, admin, user1, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000000");

      await kairos.connect(admin).mint(user1.address, amount);
      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY + amount);
    });

    it("Should emit Mint event", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10000");

      await expect(kairos.connect(admin).mint(user1.address, amount))
        .to.emit(kairos, "Mint")
        .withArgs(user1.address, amount);
    });

    it("Minting should NOT charge fee", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10000");

      await kairos.connect(admin).mint(user1.address, amount);
      expect(await kairos.balanceOf(user1.address)).to.equal(amount);
      expect(await kairos.totalFeesCollected()).to.equal(0);
    });

    it("Should revert if non-owner tries to mint", async function () {
      const { kairos, user1, user2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        kairos.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });

    it("Should revert on mint to zero address", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        kairos.connect(admin).mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(kairos, "ZeroAddress");
    });

    it("Should revert on mint of zero amount", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).mint(user1.address, 0)
      ).to.be.revertedWithCustomError(kairos, "ZeroAmount");
    });

    it("Should revert if amount exceeds mint cap", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("1000");
      const overAmount = ethers.parseEther("1001");

      await kairos.connect(admin).setMintCap(cap);
      await expect(
        kairos.connect(admin).mint(user1.address, overAmount)
      ).to.be.revertedWithCustomError(kairos, "ExceedsMintCap");
    });

    it("Should allow mint exactly at cap", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("1000");

      await kairos.connect(admin).setMintCap(cap);
      await kairos.connect(admin).mint(user1.address, cap);
      expect(await kairos.balanceOf(user1.address)).to.equal(cap);
    });

    it("Should revert on mint to blacklisted address", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user1.address);
      await expect(
        kairos.connect(admin).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "AccountBlacklisted");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                        4. BURN FUNCTION
  // ═════════════════════════════════════════════════════════════════════════

  describe("4. Burning", function () {
    it("Should allow owner to burn tokens", async function () {
      const { kairos, admin, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("5000");

      await kairos.connect(admin).burn(admin.address, amount);
      expect(await kairos.balanceOf(admin.address)).to.equal(INITIAL_SUPPLY - amount);
    });

    it("Should update totalBurned on burn", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await kairos.connect(admin).burn(admin.address, amount);
      expect(await kairos.totalBurned()).to.equal(amount);
    });

    it("Should decrease totalSupply on burn", async function () {
      const { kairos, admin, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000000");

      await kairos.connect(admin).burn(admin.address, amount);
      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
    });

    it("Should emit Burn event", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");

      await expect(kairos.connect(admin).burn(admin.address, amount))
        .to.emit(kairos, "Burn")
        .withArgs(admin.address, amount);
    });

    it("Burning should NOT charge fee", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await kairos.connect(admin).transfer(user1.address, amount);
      await kairos.connect(admin).burn(user1.address, amount);
      expect(await kairos.balanceOf(user1.address)).to.equal(0);
      expect(await kairos.totalFeesCollected()).to.equal(0);
    });

    it("Should revert if non-owner tries to burn", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("1000"));

      await expect(
        kairos.connect(user1).burn(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });

    it("Should revert on burn from zero address", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).burn(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "ZeroAddress");
    });

    it("Should revert on burn of zero amount", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).burn(admin.address, 0)
      ).to.be.revertedWithCustomError(kairos, "ZeroAmount");
    });

    it("Should revert if burn amount exceeds balance", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).burn(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(kairos, "InsufficientBalance");
    });

    it("Should revert if amount exceeds burn cap", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("500");

      await kairos.connect(admin).setBurnCap(cap);
      await expect(
        kairos.connect(admin).burn(admin.address, ethers.parseEther("501"))
      ).to.be.revertedWithCustomError(kairos, "ExceedsBurnCap");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                     5. BLACKLIST / COMPLIANCE
  // ═════════════════════════════════════════════════════════════════════════

  describe("5. Blacklist", function () {
    it("Should blacklist an address", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user1.address);
      expect(await kairos.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should emit Blacklisted event", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await expect(kairos.connect(admin).blacklist(user1.address))
        .to.emit(kairos, "Blacklisted")
        .withArgs(user1.address);
    });

    it("Should unblacklist an address", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user1.address);
      await kairos.connect(admin).unBlacklist(user1.address);
      expect(await kairos.isBlacklisted(user1.address)).to.be.false;
    });

    it("Should emit UnBlacklisted event", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user1.address);
      await expect(kairos.connect(admin).unBlacklist(user1.address))
        .to.emit(kairos, "UnBlacklisted")
        .withArgs(user1.address);
    });

    it("Blacklisted address cannot send tokens", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("1000"));
      await kairos.connect(admin).blacklist(user1.address);

      await expect(
        kairos.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "AccountBlacklisted");
    });

    it("Blacklisted address cannot receive tokens", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user1.address);

      await expect(
        kairos.connect(admin).transfer(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "AccountBlacklisted");
    });

    it("Should revert if non-owner tries to blacklist", async function () {
      const { kairos, user1, user2 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(user1).blacklist(user2.address)
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });

    it("Should revert blacklist on zero address", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).blacklist(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(kairos, "ZeroAddress");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                       6. PAUSE / UNPAUSE
  // ═════════════════════════════════════════════════════════════════════════

  describe("6. Pausable", function () {
    it("Should pause transfers", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("1000"));
      await kairos.connect(admin).pause();

      await expect(
        kairos.connect(user1).transfer(admin.address, ethers.parseEther("100"))
      ).to.be.revertedWith("KairosCoin: transfers paused");
    });

    it("Should allow owner to transfer while paused", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).pause();

      await expect(
        kairos.connect(admin).transfer(user1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should resume transfers after unpause", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("1000"));
      await kairos.connect(admin).pause();
      await kairos.connect(admin).unpause();

      await expect(
        kairos.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should revert mint when paused", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).pause();

      await expect(
        kairos.connect(admin).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "EnforcedPause");
    });

    it("Should revert burn when paused", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await kairos.connect(admin).pause();

      await expect(
        kairos.connect(admin).burn(admin.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "EnforcedPause");
    });

    it("Should revert if non-owner tries to pause", async function () {
      const { kairos, user1 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(user1).pause()
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                    7. MINT & BURN CAPS
  // ═════════════════════════════════════════════════════════════════════════

  describe("7. Caps Configuration", function () {
    it("Should set mint cap", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("1000000");

      await kairos.connect(admin).setMintCap(cap);
      expect(await kairos.mintCap()).to.equal(cap);
    });

    it("Should emit MintCapUpdated event", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("1000000");

      await expect(kairos.connect(admin).setMintCap(cap))
        .to.emit(kairos, "MintCapUpdated")
        .withArgs(0, cap);
    });

    it("Should set burn cap", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("500000");

      await kairos.connect(admin).setBurnCap(cap);
      expect(await kairos.burnCap()).to.equal(cap);
    });

    it("Should emit BurnCapUpdated event", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);
      const cap = ethers.parseEther("500000");

      await expect(kairos.connect(admin).setBurnCap(cap))
        .to.emit(kairos, "BurnCapUpdated")
        .withArgs(0, cap);
    });

    it("Should allow unlimited mint when cap is 0", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const hugeAmount = ethers.parseEther("999999999");

      await kairos.connect(admin).mint(user1.address, hugeAmount);
      expect(await kairos.balanceOf(user1.address)).to.equal(hugeAmount);
    });

    it("Should revert if non-owner sets cap", async function () {
      const { kairos, user1 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(user1).setMintCap(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                     8. BATCH TRANSFER
  // ═════════════════════════════════════════════════════════════════════════

  describe("8. Batch Transfer", function () {
    it("Should batch transfer (admin fee-exempt)", async function () {
      const { kairos, admin, user1, user2, user3 } = await loadFixture(deployFixture);

      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300"),
      ];

      await kairos.connect(admin).batchTransfer(recipients, amounts);

      expect(await kairos.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      expect(await kairos.balanceOf(user2.address)).to.equal(ethers.parseEther("200"));
      expect(await kairos.balanceOf(user3.address)).to.equal(ethers.parseEther("300"));
    });

    it("Should emit BatchTransfer event", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

      await expect(kairos.connect(admin).batchTransfer(recipients, amounts))
        .to.emit(kairos, "BatchTransfer")
        .withArgs(admin.address, ethers.parseEther("300"), 2);
    });

    it("Should revert on mismatched array lengths", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await expect(
        kairos.connect(admin).batchTransfer(
          [user1.address],
          [ethers.parseEther("100"), ethers.parseEther("200")]
        )
      ).to.be.revertedWithCustomError(kairos, "ArrayLengthMismatch");
    });

    it("Should revert if sender is blacklisted", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("1000"));
      await kairos.connect(admin).blacklist(user1.address);

      await expect(
        kairos.connect(user1).batchTransfer(
          [user2.address],
          [ethers.parseEther("100")]
        )
      ).to.be.revertedWithCustomError(kairos, "AccountBlacklisted");
    });

    it("Should revert if any recipient is blacklisted", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).blacklist(user2.address);

      await expect(
        kairos.connect(admin).batchTransfer(
          [user1.address, user2.address],
          [ethers.parseEther("100"), ethers.parseEther("200")]
        )
      ).to.be.revertedWithCustomError(kairos, "AccountBlacklisted");
    });

    it("Should revert if insufficient total balance", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transfer(user1.address, ethers.parseEther("100"));

      await expect(
        kairos.connect(user1).batchTransfer(
          [user2.address, admin.address],
          [ethers.parseEther("60"), ethers.parseEther("60")]
        )
      ).to.be.revertedWithCustomError(kairos, "InsufficientBalance");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                       9. OWNERSHIP
  // ═════════════════════════════════════════════════════════════════════════

  describe("9. Ownership", function () {
    it("Should transfer ownership", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transferOwnership(user1.address);
      expect(await kairos.owner()).to.equal(user1.address);
    });

    it("New owner should be able to mint", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transferOwnership(user1.address);
      await kairos.connect(user1).mint(user2.address, ethers.parseEther("1000"));
      expect(await kairos.balanceOf(user2.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Old owner should NOT be able to mint after transfer", async function () {
      const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

      await kairos.connect(admin).transferOwnership(user1.address);

      await expect(
        kairos.connect(admin).mint(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
    });

    it("Should renounce ownership", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await kairos.connect(admin).renounceOwnership();
      expect(await kairos.owner()).to.equal(ethers.ZeroAddress);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                   10. ERC-2612 PERMIT (GASLESS)
  // ═════════════════════════════════════════════════════════════════════════

  describe("10. ERC-2612 Permit (Gasless Approvals)", function () {
    it("Should support permit (EIP-2612)", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonce = await kairos.nonces(admin.address);

      const domain = {
        name: "Kairos Coin",
        version: "1",
        chainId: 31337,
        verifyingContract: await kairos.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const value = {
        owner: admin.address,
        spender: user1.address,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await admin.signTypedData(domain, types, value);
      const { v, r, s } = ethers.Signature.from(signature);

      await kairos.permit(admin.address, user1.address, amount, deadline, v, r, s);

      expect(await kairos.allowance(admin.address, user1.address)).to.equal(amount);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                      11. VIEW FUNCTIONS
  // ═════════════════════════════════════════════════════════════════════════

  describe("11. View Functions", function () {
    it("Should return correct netMinted (positive)", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      await kairos.connect(admin).mint(user1.address, ethers.parseEther("5000"));
      await kairos.connect(admin).burn(admin.address, ethers.parseEther("2000"));

      expect(await kairos.netMinted()).to.equal(ethers.parseEther("3000"));
    });

    it("Should return correct netMinted (negative)", async function () {
      const { kairos, admin } = await loadFixture(deployFixture);

      await kairos.connect(admin).mint(admin.address, ethers.parseEther("1000"));
      await kairos.connect(admin).burn(admin.address, ethers.parseEther("5000"));

      expect(await kairos.netMinted()).to.equal(ethers.parseEther("-4000"));
    });

    it("Should check blacklist status correctly", async function () {
      const { kairos, admin, user1 } = await loadFixture(deployFixture);

      expect(await kairos.isBlacklisted(user1.address)).to.be.false;
      await kairos.connect(admin).blacklist(user1.address);
      expect(await kairos.isBlacklisted(user1.address)).to.be.true;
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //               12. SUPPLY MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════

  describe("12. Supply Expansion & Contraction", function () {
    it("Should expand supply (deposit scenario)", async function () {
      const { kairos, admin, user1, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      const depositAmount = ethers.parseEther("1000000");

      await kairos.connect(admin).mint(user1.address, depositAmount);

      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY + depositAmount);
      expect(await kairos.balanceOf(user1.address)).to.equal(depositAmount);
    });

    it("Should contract supply (withdrawal scenario)", async function () {
      const { kairos, admin, user1, INITIAL_SUPPLY } = await loadFixture(deployFixture);
      const withdrawAmount = ethers.parseEther("500000");

      await kairos.connect(admin).transfer(user1.address, withdrawAmount);
      await kairos.connect(admin).burn(user1.address, withdrawAmount);

      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY - withdrawAmount);
      expect(await kairos.balanceOf(user1.address)).to.equal(0);
    });

    it("Should handle multiple mints and burns correctly", async function () {
      const { kairos, admin, user1, INITIAL_SUPPLY } = await loadFixture(deployFixture);

      await kairos.connect(admin).mint(user1.address, ethers.parseEther("1000"));
      await kairos.connect(admin).mint(user1.address, ethers.parseEther("2000"));
      await kairos.connect(admin).mint(user1.address, ethers.parseEther("3000"));

      await kairos.connect(admin).burn(user1.address, ethers.parseEther("500"));
      await kairos.connect(admin).burn(user1.address, ethers.parseEther("1500"));

      expect(await kairos.totalMinted()).to.equal(ethers.parseEther("6000"));
      expect(await kairos.totalBurned()).to.equal(ethers.parseEther("2000"));
      expect(await kairos.balanceOf(user1.address)).to.equal(ethers.parseEther("4000"));
      expect(await kairos.totalSupply()).to.equal(INITIAL_SUPPLY + ethers.parseEther("4000"));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  //                  13. FEE SYSTEM — THE CORE INNOVATION
  // ═════════════════════════════════════════════════════════════════════════

  describe("13. Fee System (60% cheaper than USDT/USDC)", function () {

    describe("13a. Fee Collection on Transfers", function () {
      it("Should charge 8 bps fee on user-to-user transfer", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).transfer(user1.address, amount);

        const fee = calcFee(amount);
        const amountAfterFee = amount - fee;

        await kairos.connect(user1).transfer(user2.address, amount);

        expect(await kairos.balanceOf(user2.address)).to.equal(amountAfterFee);
        expect(await kairos.balanceOf(reserve.address)).to.equal(fee);
        expect(await kairos.totalFeesCollected()).to.equal(fee);
      });

      it("Should emit FeeCollected event", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("5000");

        await kairos.connect(admin).transfer(user1.address, amount);

        const fee = calcFee(amount);

        await expect(kairos.connect(user1).transfer(user2.address, amount))
          .to.emit(kairos, "FeeCollected")
          .withArgs(user1.address, user2.address, fee, reserve.address);
      });

      it("Fee should be exactly 0.08% (8 basis points)", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000000");

        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(user1).transfer(user2.address, amount);

        const expectedFee = ethers.parseEther("800");
        expect(await kairos.balanceOf(reserve.address)).to.equal(expectedFee);
        expect(await kairos.balanceOf(user2.address)).to.equal(amount - expectedFee);
      });

      it("Fee-exempt sender should NOT pay fee", async function () {
        const { kairos, admin, reserve, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000");

        await kairos.connect(admin).transfer(user1.address, amount);

        expect(await kairos.balanceOf(user1.address)).to.equal(amount);
        expect(await kairos.balanceOf(reserve.address)).to.equal(0);
      });

      it("Fee-exempt receiver should NOT trigger fee", async function () {
        const { kairos, admin, reserve, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000");

        await kairos.connect(admin).transfer(user1.address, amount);

        const adminBalBefore = await kairos.balanceOf(admin.address);
        await kairos.connect(user1).transfer(admin.address, amount);

        expect(await kairos.balanceOf(admin.address)).to.equal(adminBalBefore + amount);
        expect(await kairos.balanceOf(reserve.address)).to.equal(0);
      });

      it("Accumulates fees over multiple transfers", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(admin).transfer(user2.address, amount);

        await kairos.connect(user1).transfer(user2.address, ethers.parseEther("5000"));
        await kairos.connect(user2).transfer(user1.address, ethers.parseEther("5000"));

        const expectedTotalFee = ethers.parseEther("8"); // 4 + 4
        expect(await kairos.totalFeesCollected()).to.equal(expectedTotalFee);
        expect(await kairos.balanceOf(reserve.address)).to.equal(expectedTotalFee);
      });

      it("No fee on transfer TO reserve wallet directly", async function () {
        const { kairos, admin, reserve, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000");

        await kairos.connect(admin).transfer(user1.address, amount);

        await kairos.connect(user1).transfer(reserve.address, amount);

        expect(await kairos.balanceOf(reserve.address)).to.equal(amount);
        expect(await kairos.totalFeesCollected()).to.equal(0);
      });
    });

    describe("13b. Fee Rate Configuration", function () {
      it("Should update fee rate", async function () {
        const { kairos, admin } = await loadFixture(deployFixture);

        await kairos.connect(admin).setFeeBps(5);
        expect(await kairos.feeBps()).to.equal(5);
      });

      it("Should emit FeeUpdated event", async function () {
        const { kairos, admin } = await loadFixture(deployFixture);

        await expect(kairos.connect(admin).setFeeBps(10))
          .to.emit(kairos, "FeeUpdated")
          .withArgs(8, 10);
      });

      it("Should allow setting fee to 0 (disable)", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000");

        await kairos.connect(admin).setFeeBps(0);
        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(user1).transfer(user2.address, amount);

        expect(await kairos.balanceOf(user2.address)).to.equal(amount);
        expect(await kairos.balanceOf(reserve.address)).to.equal(0);
      });

      it("Should revert if fee exceeds MAX_FEE_BPS (20)", async function () {
        const { kairos, admin } = await loadFixture(deployFixture);

        await expect(
          kairos.connect(admin).setFeeBps(21)
        ).to.be.revertedWithCustomError(kairos, "FeeExceedsMax");
      });

      it("Should allow max fee of 20 bps", async function () {
        const { kairos, admin } = await loadFixture(deployFixture);

        await kairos.connect(admin).setFeeBps(20);
        expect(await kairos.feeBps()).to.equal(20);
      });

      it("Should revert if non-owner tries to set fee", async function () {
        const { kairos, user1 } = await loadFixture(deployFixture);

        await expect(
          kairos.connect(user1).setFeeBps(5)
        ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
      });

      it("Changed fee rate applies to subsequent transfers", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).transfer(user1.address, amount);

        await kairos.connect(admin).setFeeBps(10);

        await kairos.connect(user1).transfer(user2.address, amount);

        const expectedFee = ethers.parseEther("10");
        expect(await kairos.balanceOf(reserve.address)).to.equal(expectedFee);
        expect(await kairos.balanceOf(user2.address)).to.equal(amount - expectedFee);
      });
    });

    describe("13c. Reserve Wallet Management", function () {
      it("Should update reserve wallet", async function () {
        const { kairos, admin, user1 } = await loadFixture(deployFixture);

        await kairos.connect(admin).setReserveWallet(user1.address);
        expect(await kairos.reserveWallet()).to.equal(user1.address);
      });

      it("Should emit ReserveWalletUpdated event", async function () {
        const { kairos, admin, reserve, user1 } = await loadFixture(deployFixture);

        await expect(kairos.connect(admin).setReserveWallet(user1.address))
          .to.emit(kairos, "ReserveWalletUpdated")
          .withArgs(reserve.address, user1.address);
      });

      it("New reserve should be fee-exempt, old should lose exemption", async function () {
        const { kairos, admin, reserve, user1 } = await loadFixture(deployFixture);

        await kairos.connect(admin).setReserveWallet(user1.address);

        expect(await kairos.feeExempt(user1.address)).to.be.true;
        expect(await kairos.feeExempt(reserve.address)).to.be.false;
      });

      it("Should revert on zero address for reserve wallet", async function () {
        const { kairos, admin } = await loadFixture(deployFixture);

        await expect(
          kairos.connect(admin).setReserveWallet(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(kairos, "ZeroAddress");
      });

      it("Fees go to new reserve after change", async function () {
        const { kairos, admin, reserve, user1, user2, user3 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).setReserveWallet(user3.address);

        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(user1).transfer(user2.address, amount);

        const fee = calcFee(amount);
        expect(await kairos.balanceOf(user3.address)).to.equal(fee);
        expect(await kairos.balanceOf(reserve.address)).to.equal(0);
      });
    });

    describe("13d. Fee Exemption Management", function () {
      it("Should set fee exemption for an address", async function () {
        const { kairos, admin, user1 } = await loadFixture(deployFixture);

        await kairos.connect(admin).setFeeExempt(user1.address, true);
        expect(await kairos.feeExempt(user1.address)).to.be.true;
      });

      it("Should emit FeeExemptionUpdated event", async function () {
        const { kairos, admin, user1 } = await loadFixture(deployFixture);

        await expect(kairos.connect(admin).setFeeExempt(user1.address, true))
          .to.emit(kairos, "FeeExemptionUpdated")
          .withArgs(user1.address, true);
      });

      it("Fee-exempt address pays no fee", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(admin).setFeeExempt(user1.address, true);

        await kairos.connect(user1).transfer(user2.address, amount);

        expect(await kairos.balanceOf(user2.address)).to.equal(amount);
        expect(await kairos.balanceOf(reserve.address)).to.equal(0);
      });

      it("Removing exemption restores fee", async function () {
        const { kairos, admin, reserve, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("10000");

        await kairos.connect(admin).transfer(user1.address, amount);
        await kairos.connect(admin).setFeeExempt(user1.address, true);
        await kairos.connect(admin).setFeeExempt(user1.address, false);

        await kairos.connect(user1).transfer(user2.address, amount);

        const fee = calcFee(amount);
        expect(await kairos.balanceOf(user2.address)).to.equal(amount - fee);
        expect(await kairos.balanceOf(reserve.address)).to.equal(fee);
      });

      it("Should revert if non-owner sets exemption", async function () {
        const { kairos, user1, user2 } = await loadFixture(deployFixture);

        await expect(
          kairos.connect(user1).setFeeExempt(user2.address, true)
        ).to.be.revertedWithCustomError(kairos, "OwnableUnauthorizedAccount");
      });
    });

    describe("13e. calculateFee() View Function", function () {
      it("Should return correct fee for user-to-user", async function () {
        const { kairos, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("100000");

        const fee = await kairos.calculateFee(user1.address, user2.address, amount);
        expect(fee).to.equal(calcFee(amount));
      });

      it("Should return 0 for mint (from = address(0))", async function () {
        const { kairos, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("100000");

        const fee = await kairos.calculateFee(ethers.ZeroAddress, user1.address, amount);
        expect(fee).to.equal(0);
      });

      it("Should return 0 for burn (to = address(0))", async function () {
        const { kairos, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("100000");

        const fee = await kairos.calculateFee(user1.address, ethers.ZeroAddress, amount);
        expect(fee).to.equal(0);
      });

      it("Should return 0 for fee-exempt sender", async function () {
        const { kairos, admin, user1 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("100000");

        const fee = await kairos.calculateFee(admin.address, user1.address, amount);
        expect(fee).to.equal(0);
      });

      it("Should return 0 when feeBps = 0", async function () {
        const { kairos, admin, user1, user2 } = await loadFixture(deployFixture);

        await kairos.connect(admin).setFeeBps(0);

        const fee = await kairos.calculateFee(user1.address, user2.address, ethers.parseEther("100000"));
        expect(fee).to.equal(0);
      });
    });

    describe("13f. Fee Comparison vs USDT/USDC", function () {
      it("KAIROS fee (8 bps) is 60% less than USDT max (20 bps)", async function () {
        const { kairos } = await loadFixture(deployFixture);

        const kairosFee = await kairos.feeBps();
        const usdtMaxFee = await kairos.MAX_FEE_BPS();

        const savings = ((usdtMaxFee - kairosFee) * 100n) / usdtMaxFee;
        expect(savings).to.equal(60n);
      });

      it("Fee on $1,000,000 transfer: $800 (vs $2,000 for USDT max)", async function () {
        const { kairos, user1, user2 } = await loadFixture(deployFixture);
        const amount = ethers.parseEther("1000000");

        const fee = await kairos.calculateFee(user1.address, user2.address, amount);

        expect(fee).to.equal(ethers.parseEther("800"));
      });
    });
  });
});
