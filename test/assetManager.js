const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetManager", function () {
  it("create new Strategy when deploy", async function () {
    const ToString = await ethers.getContractFactory("ToString");
    const toString = await ToString.deploy();
    await toString.deployed();

    const AssetManager = await ethers.getContractFactory("AssetManager", {
      libraries: {
        ToString: toString.address,
      },
    });

    const assetManager = await AssetManager.deploy();
    await assetManager.deployed();

    expect(await assetManager.strategyList(0)).to.not.be.empty;
  });
});

describe("Strategy", function () {
  it("create Portfolio when deposit()", async function () {
    const ToString = await ethers.getContractFactory("ToString");
    const toString = await ToString.deploy();
    await toString.deployed();

    const AssetManager = await ethers.getContractFactory("AssetManager", {
      libraries: {
        ToString: toString.address,
      },
    });
    const Strategy = await ethers.getContractFactory("Strategy", {
      libraries: {
        ToString: toString.address,
      },
    });

    const assetManager = await AssetManager.deploy();
    await assetManager.deployed();

    const strategyAddress = await assetManager.strategyList(0);
    console.log(strategyAddress);
    const strategy = await Strategy.attach(strategyAddress);
    // const strategy = await ethers.getContractAt("Strategy", strategyAddress);
    expect(strategy).to.not.be.empty;

    const depositTx = await strategy.deposit({ value: ethers.utils.parseEther("1.0") });
    await depositTx.wait();

    const portfolioAddress = await strategy.portfolioList(0);
    console.log(portfolioAddress);
    expect(portfolioAddress).to.not.be.empty;

    const tokenId = await strategy.getLastTokenId();
    const uri = await strategy.tokenURI(tokenId);
    console.log(uri);

  });
});
