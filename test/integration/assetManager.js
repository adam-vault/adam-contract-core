const { expect } = require("chai");
const { waffle, ethers } = require('hardhat');
const AssetManager = require('../../build/AssetManager.json');
const Strategy = require('../../build/Strategy.json');
const ToString = require('../../build/ToString.json');

const { deployContract, link } = waffle;

describe("AssetManager", function () {
  let wallet;
  let contract;

  before(async function () {
    const [libCreator] = await ethers.getSigners();
    const toStringLib = await deployContract(libCreator, ToString, []);
    link(AssetManager, 'contracts/ToString.sol:ToString', toStringLib.address);
    link(Strategy, 'contracts/ToString.sol:ToString', toStringLib.address);
  });

  beforeEach(async function () {
    [wallet] = await ethers.getSigners();
    contract = await deployContract(wallet, AssetManager, ["AM Ltd"]);
  });

  it("has no strategy when deploy", async function () {
    expect(await contract.strategyCount()).to.equal(0);
  });
  it("can create strategy", async function () {
    console.log(contract);
    expect(await contract.createStrategy("Global Assets")).to.not.be.null;
    expect(await contract.strategyCount()).to.equal(1);
  });

  it("create Portfolio when deposit()", async function () {


    // const assetManager = await AssetManager.deploy();
    // await assetManager.deployed();

    // const strategyAddress = await assetManager.strategyList(0);
    // console.log(strategyAddress);
    // const strategy = await Strategy.attach(strategyAddress);
    // // const strategy = await ethers.getContractAt("Strategy", strategyAddress);
    // expect(strategy).to.not.be.empty;

    // const depositTx = await strategy.deposit({ value: ethers.utils.parseEther("1.0") });
    // await depositTx.wait();

    // const portfolioAddress = await strategy.portfolioList(0);
    // console.log(portfolioAddress);
    // expect(portfolioAddress).to.not.be.empty;

    // const tokenId = await strategy.getLastTokenId();
    // const uri = await strategy.tokenURI(tokenId);
    // console.log(uri);

  });
});
