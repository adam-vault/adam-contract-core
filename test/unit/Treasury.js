const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');
const { ethers, waffle } = require('hardhat');

describe('Treasury', function() {
    let priceConverter;
    let treasury;
    let creator, owner1, owner2, owner3;
    let adam, strategyFactory, assetManagerFactory;
    let libraries;
    let tokenA;
    const provider = waffle.provider;

    before(async function () {
        const [libCreator] = await ethers.getSigners();
        const ToString = await ethers.getContractFactory('ToString', libCreator);
        const toString = await ToString.deploy();
        await toString.deployed();
    
        libraries = {
          ToString: toString.address,
        };

        const TokenA = await ethers.getContractFactory('TokenA');
        tokenA = await TokenA.deploy();
        await tokenA.deployed();
      });

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();
        const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator, libraries });
        const StrategyFactory = await ethers.getContractFactory('StrategyFactory', { signer: creator, libraries });
        const Adam = await ethers.getContractFactory('Adam', { signer: creator });
    
        assetManagerFactory = await AssetManagerFactory.deploy();
        strategyFactory = await StrategyFactory.deploy();
    
        await strategyFactory.deployed();
        await assetManagerFactory.deployed();
        adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
        await adam.deployed();
        /**
         * Mocks are deployed contract wrappers that have all of the fake’s functionality and even more.
         * Because they are actually deployed contract, they can have actual logic inside that can be called through. And because they have a storage, internal variable values can be overwritten
        */
        const PriceConverter = await smock.mock('PriceConverter');
        priceConverter = await PriceConverter.deploy();
        await priceConverter.deployed();
        /**
         * Prepare to modify the internal storage of contract via smoddit
        */
        const Treasury = await smock.mock("ExposedTreasury");
        treasury = await Treasury.deploy(adam.address, priceConverter.address);
        await treasury.deployed();
    });

    describe('redemption mgmt fee flow', function() {
        it('should have correct balance', async function() {

            /**
             * 1. Create assetManager
             * 2. Create strategy & a management fee account
             * 3. Owner1 deposit to strategy to create a user portfolio
             * 4. AM trigger a charge mgmt fee which should be called automatically later on
             * 5. AM trigger owned strategies management fee account redemption
             * 6. Management fee account -> Strategy -> AM -> Treasury
             * 7a. Expect Treasury to have ether
             * 7b. Expect Management fee account's token is burnt
             * 7c. Expect AM's money is transfer to Treasury
             * 7d. Expect EVE is send to owner's address
            */
           expect(await provider.getBalance(treasury.address)).to.equal(0);

            await adam.createAssetManager('Eddy');

            const amAddr = await adam.assetManagers(0);
            const assetManager = await ethers.getContractAt('AssetManager', amAddr);
            await assetManager.approve(tokenA.address, treasury.address, "10000");
            expect(await tokenA.allowance(assetManager.address, treasury.address)).to.equal(10000);

            await adam.createStrategy(assetManager.address, 'RockYou', false);
            const strategyAddr = await adam.publicStrategies(0);
            const strategy = await ethers.getContractAt('Strategy', strategyAddr);
            await strategy.connect(owner1).deposit({ value: ethers.utils.parseEther('1.0') });
            expect(await provider.getBalance(assetManager.address)).to.equal(ethers.utils.parseEther('1.0'));

            const mgtFeeAddr = await strategy.mtFeeAccount();
            await assetManager.chargeManagementFee(mgtFeeAddr);

            expect(await assetManager.balanceOf(mgtFeeAddr, 0)).to.equal(ethers.utils.parseEther('1.0'));
            expect(await strategy.balanceOf(owner1.address)).to.equal(1);

            const mgtFee = await ethers.getContractAt('ManagementFee', mgtFeeAddr);
            await mgtFee.redemption(owner2.address);

            expect(await provider.getBalance(assetManager.address)).to.equal(0);
            expect(await provider.getBalance(treasury.address)).to.equal(ethers.utils.parseEther('1.0'));
            expect(await treasury.balanceOf(owner2.address)).to.equal(ethers.utils.parseEther('1.0'));
        });
    });
});