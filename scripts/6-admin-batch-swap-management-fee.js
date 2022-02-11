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
   
    const adam = await hre.ethers.getContractAt('Adam', '0x20013137e03d5a6172FC832ED5A6969C741DD713');

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

    const managerAddr = await adam.assetManagers(0);
    console.log("===Asset manager===", managerAddr);

    const assetManager1 = await ethers.getContractAt('AssetManager', managerAddr);

    nonceManager.incrementTransactionCount();
    tx = await adam.createStrategy(assetManager1.address, 'Test2', false);
    await tx.wait();

    tx = await adam.createStrategy(assetManager1.address, 'Test3', false);
    await tx.wait();

    const strategy2Addr = await adam.publicStrategies(1);
    const strategy2 = await ethers.getContractAt('Strategy', strategy2Addr);
    console.log("====strategy2====", strategy2Addr);

    nonceManager.incrementTransactionCount();
    tx = await strategy2.deposit({ value: ethers.utils.parseEther('0.01') });
    await tx.wait();

    const strategy3Addr = await adam.publicStrategies(2);
    const strategy3 = await ethers.getContractAt('Strategy', strategy3Addr);
    console.log("====strategy3====", strategy3Addr);

    nonceManager.incrementTransactionCount();
    tx = await strategy3.deposit({ value: ethers.utils.parseEther('0.01') });
    await tx.wait();

    console.log("===Balance of asset manager==", await provider.getBalance(assetManager1.address));

    console.log("====(Strategy 2)=====");
    const mgtFeeAddr2 = await strategy2.mtFeeAccount();
    const mgtFee2 = await ethers.getContractAt('ManagementFee', mgtFeeAddr2);
    
    nonceManager.incrementTransactionCount();
    tx = await mgtFee2.setBeneficiary(creator.address);
    await tx.wait();

    console.log("====Beneficiary set====")

    nonceManager.incrementTransactionCount();
    tx = await assetManager1.chargeManagementFee(linkToken.address, mgtFeeAddr2);
    await tx.wait();

    console.log("====Management fee charged====")

    nonceManager.incrementTransactionCount();
    await linkToken.transfer(assetManager1.address, hre.ethers.utils.parseEther('0.01'));
    await tx.wait();

    console.log("====link token transferred=====");
    console.log("====(Strategy 3)=====");
    const mgtFeeAddr3 = await strategy3.mtFeeAccount();
    const mgtFee3 = await ethers.getContractAt('ManagementFee', mgtFeeAddr3);
    
    nonceManager.incrementTransactionCount();
    tx = await mgtFee3.setBeneficiary(creator.address);
    await tx.wait();

    console.log("====Beneficiary set====")

    nonceManager.incrementTransactionCount();
    tx = await assetManager1.chargeManagementFee(linkToken.address, mgtFeeAddr3);
    await tx.wait();

    console.log("====Management fee charged====")

    nonceManager.incrementTransactionCount();
    await linkToken.transfer(assetManager1.address, hre.ethers.utils.parseEther('0.01'));
    await tx.wait();

    
    console.log("Balance of managementFee2(ether): ", await assetManager1.balanceOf(mgtFeeAddr2, 1));
    console.log("Balance of managementFee2(LINK): ", await assetManager1.balanceOf(mgtFeeAddr2, 2));
    console.log("Balance of managementFee3(ether): ", await assetManager1.balanceOf(mgtFeeAddr3, 1));
    console.log("Balance of managementFee3(LINK): ", await assetManager1.balanceOf(mgtFeeAddr3, 2));
    console.log("Balance of asset manager(ether):", await provider.getBalance(assetManager1.address));
    console.log("Balance of asset manager(LINK):", await linkToken.balanceOf(assetManager1.address));
    
    console.log("====redemption start====");
    nonceManager.incrementTransactionCount();
    await adam.redempAllManagementFee();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
