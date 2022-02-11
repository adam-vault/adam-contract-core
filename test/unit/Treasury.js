const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');
const { ethers, waffle } = require('hardhat');

describe('Treasury', function() {
    let priceConverter, treasury, adam;
    let creator, owner1, owner2, owner3;
    let tokenA;
    const provider = waffle.provider;

    before(async function () {
        const TokenA = await ethers.getContractFactory('TokenA');
        tokenA = await TokenA.deploy();
        await tokenA.deployed();
      });

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();
        const AssetManager = await ethers.getContractFactory('AssetManager');
        const Strategy = await ethers.getContractFactory('Strategy');
        const Adam = await ethers.getContractFactory('Adam');
      
        const assetManager = await AssetManager.deploy();
        await assetManager.deployed();
        const strategy = await Strategy.deploy();
        await strategy.deployed();
      
        adam = await hre.upgrades.deployProxy(Adam, [assetManager.address, strategy.address], { kind: 'uups' });
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
        treasury = await hre.upgrades.deployProxy(Treasury, [adam.address, priceConverter.address]);
        await treasury.deployed();
    });

    describe('exchange eve', function() {
        it('should be success', async function() {
            await tokenA.connect(owner3).approve(treasury.address, ethers.utils.parseEther('10.0'));
            expect(await tokenA.allowance(owner3.address, treasury.address)).to.equal(ethers.utils.parseEther('10.0'));

            await tokenA.mint(owner3.address, ethers.utils.parseEther('1.0'));

            await expect(treasury.connect(owner3).exchangeEVE2(owner3.address, tokenA.address, ethers.utils.parseEther('0.5'))).to.not.be.reverted;
        });

        it('should return 7.5 as eve price', async function () {
            /**
             * ASSUME
             * 1 ETH = 10 USD
             * 1 A = 5 USD
             * EVE = 50% ETH + 50% A
             * 10/2 + 5/2 = 7.5 USD / EVE
            */
            
            expect(await treasury.getEVEPrice()).to.equal(7.5 * 10**8);
        });
    });

    describe('redemption mgmt fee flow (Manager)', function() {
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
            await assetManager.approve(tokenA.address, treasury.address, String(100*10**18));
            expect(await tokenA.allowance(assetManager.address, treasury.address)).to.equal(String(100*10**18));

            await adam.createStrategy(assetManager.address, 'RockYou', false);
            const strategyAddr = await adam.publicStrategies(0);
            const strategy = await ethers.getContractAt('Strategy', strategyAddr);
            await strategy.connect(owner1).deposit({ value: ethers.utils.parseEther('10.0') });
            expect(await provider.getBalance(assetManager.address)).to.equal(ethers.utils.parseEther('10.0'));

            const mgtFeeAddr = await strategy.mtFeeAccount();
            await assetManager.chargeManagementFee(tokenA.address, mgtFeeAddr);
            await tokenA.mint(assetManager.address, String(10*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 1)).to.equal(String(10*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 2)).to.equal(String(5*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 3)).to.equal(String(5*10**18));
            expect(await strategy.balanceOf(owner1.address)).to.equal(1);

            const mgtFee = await ethers.getContractAt('ManagementFee', mgtFeeAddr);
            await mgtFee.setBeneficiary(owner2.address);
            await mgtFee.redemption();

            // all ether or token take out from am
            expect(await provider.getBalance(assetManager.address)).to.equal(0);
            expect(await tokenA.balanceOf(assetManager.address)).to.equal(0);
            // all ether or token transferred to treasury
            expect(await provider.getBalance(treasury.address)).to.equal(ethers.utils.parseEther('10.0'));
            expect(await tokenA.balanceOf(treasury.address)).to.equal(String(10*10**18));
            // owner get corresponding amount of EVE
            expect(await treasury.balanceOf(owner2.address)).to.be.within(String(19*10**18), String(20*10**18));
        });
    });

    describe('redemption mgmt fee flow (Admin)', function() {
        it('should have correct balance', async function() {

            /**
             * Same flow as redemption mgmt fee flow (Manager)
             * But one more management account is added and different trigger point
            */
            expect(await provider.getBalance(treasury.address)).to.equal(0);

            await adam.createAssetManager('Eddy');
            await adam.createAssetManager('Eddy2');

            const amAddr1 = await adam.assetManagers(0);
            const assetManager = await ethers.getContractAt('AssetManager', amAddr1);
            await assetManager.approve(tokenA.address, treasury.address, String(100*10**18));
            expect(await tokenA.allowance(assetManager.address, treasury.address)).to.equal(String(100*10**18));

            await adam.createStrategy(assetManager.address, 'RockYou', false);
            const strategyAddr = await adam.publicStrategies(0);
            const strategy = await ethers.getContractAt('Strategy', strategyAddr);
            await strategy.connect(owner1).deposit({ value: ethers.utils.parseEther('10.0') });
            expect(await provider.getBalance(assetManager.address)).to.equal(ethers.utils.parseEther('10.0'));

            const mgtFeeAddr = await strategy.mtFeeAccount();
            const mgtFee = await ethers.getContractAt('ManagementFee', mgtFeeAddr);
            await mgtFee.setBeneficiary(owner2.address);
            await assetManager.chargeManagementFee(tokenA.address, mgtFeeAddr);
            await tokenA.mint(assetManager.address, String(10*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 1)).to.equal(String(10*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 2)).to.equal(String(5*10**18));
            expect(await assetManager.balanceOf(mgtFeeAddr, 3)).to.equal(String(5*10**18));
            expect(await strategy.balanceOf(owner1.address)).to.equal(1);

            const amAddr2 = await adam.assetManagers(1);
            const assetManager2 = await ethers.getContractAt('AssetManager', amAddr2);
            await assetManager2.approve(tokenA.address, treasury.address, String(100*10**18));
            expect(await tokenA.allowance(assetManager2.address, treasury.address)).to.equal(String(100*10**18));

            await adam.createStrategy(assetManager2.address, 'RockYou2', false);
            const strategyAddr2 = await adam.publicStrategies(1);
            const strategy2 = await ethers.getContractAt('Strategy', strategyAddr2);
            await strategy2.connect(owner1).deposit({ value: ethers.utils.parseEther('10.0') });
            expect(await provider.getBalance(assetManager.address)).to.equal(ethers.utils.parseEther('10.0'));

            const mgtFeeAddr2 = await strategy2.mtFeeAccount();
            const mgtFee2 = await ethers.getContractAt('ManagementFee', mgtFeeAddr2);
            await mgtFee2.setBeneficiary(owner2.address);
            await assetManager2.chargeManagementFee(tokenA.address, mgtFeeAddr2);
            await tokenA.mint(assetManager2.address, String(10*10**18));
            expect(await assetManager2.balanceOf(mgtFeeAddr2, 1)).to.equal(String(10*10**18));
            expect(await assetManager2.balanceOf(mgtFeeAddr2, 2)).to.equal(String(5*10**18));
            expect(await assetManager2.balanceOf(mgtFeeAddr2, 3)).to.equal(String(5*10**18));
            expect(await strategy2.balanceOf(owner1.address)).to.equal(1);

            await adam.redempAllManagementFee();

            // all ether or token take out from am
            expect(await provider.getBalance(assetManager.address)).to.equal(0);
            expect(await tokenA.balanceOf(assetManager.address)).to.equal(0);
            expect(await provider.getBalance(assetManager2.address)).to.equal(0);
            expect(await tokenA.balanceOf(assetManager2.address)).to.equal(0);
            // all ether or token transferred to treasury
            expect(await provider.getBalance(treasury.address)).to.equal(ethers.utils.parseEther('20.0'));
            expect(await tokenA.balanceOf(treasury.address)).to.equal(String(20*10**18));
            // owner get corresponding amount of EVE
            expect(await treasury.balanceOf(owner2.address)).to.be.within(String(39*10**18), String(40*10**18));
        });
    });
});