// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
require('dotenv').config();
const { NonceManager } = require("@ethersproject/experimental");

async function main () {
    const [creator] = await hre.ethers.getSigners();
    const provider = await hre.ethers.getDefaultProvider('https://eth-kovan.alchemyapi.io/v2/ZILdPh7v4040WanO-SV3JFj6ic6SQieq');
   
    const adam = await hre.ethers.getContractAt('Adam', '0xf35ad9EdB66A2731510cD8a63a883ad4370abD08');
    const treasury = await hre.ethers.getContractAt('Treasury', '0x712586733f78D8133485D60faBD8e027E1F2c836');

    const linkToken = new hre.ethers.Contract('0xa36085F69e2889c224210F603D836748e7dC0088', [
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_to",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_owner",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "name": "balance",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
    ], creator);

    const nonceManager = new NonceManager(creator);

    let tx = await adam.createAssetManager('Manager1');
    await tx.wait();

    const managerAddr = await adam.assetManagers(0);
    console.log("===Asset manager===", managerAddr);

    const assetManager1 = await ethers.getContractAt('AssetManager', managerAddr);
    
    nonceManager.incrementTransactionCount();
    tx = await assetManager1.approve(linkToken.address, treasury.address, hre.ethers.utils.parseEther('10'));
    await tx.wait();

    nonceManager.incrementTransactionCount();
    tx = await adam.createStrategy(assetManager1.address, 'Test1', false);
    await tx.wait();

    const strategy1Addr = await adam.publicStrategies(0);
    const strategy1 = await ethers.getContractAt('Strategy', strategy1Addr);
    console.log("====strategy1====", strategy1Addr);

    nonceManager.incrementTransactionCount();
    tx = await strategy1.deposit({ value: ethers.utils.parseEther('0.01') });
    await tx.wait();
    console.log("===Balance of asset manager==", await provider.getBalance(assetManager1.address));

    const mgtFeeAddr1 = await strategy1.mtFeeAccount();
    const mgtFee1 = await ethers.getContractAt('ManagementFee', mgtFeeAddr1);
    console.log("=======mgtFee1=======", mgtFeeAddr1);
    
    nonceManager.incrementTransactionCount();
    tx = await mgtFee1.setBeneficiary(creator.address);
    await tx.wait();

    console.log("====Beneficiary set====")

    nonceManager.incrementTransactionCount();
    tx = await assetManager1.chargeManagementFee(linkToken.address, mgtFeeAddr1);
    await tx.wait();

    console.log("====Management fee charged====")

    nonceManager.incrementTransactionCount();
    await linkToken.transfer(assetManager1.address, hre.ethers.utils.parseEther('0.01'));
    await tx.wait();

    console.log("====link token transferred=====");
    
    console.log("Balance of managementFee(ether): ", await assetManager1.balanceOf(mgtFeeAddr1, 1));
    console.log("Balance of managementFee(LINK): ", await assetManager1.balanceOf(mgtFeeAddr1, 2));
    console.log("Balance of asset manager(ether):", await provider.getBalance(assetManager1.address));
    console.log("Balance of asset manager(LINK):", await linkToken.balanceOf(assetManager1.address));

    console.log("Balance of executor:", await provider.getBalance(creator.address));
    console.log("Estimated gas fee:", await mgtFee1.estimateGas.redemption());
    console.log("Treasury:", await treasury.getEVEPrice());

    console.log("====redemption start====");
    nonceManager.incrementTransactionCount();
    await mgtFee1.redemption();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main2().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
