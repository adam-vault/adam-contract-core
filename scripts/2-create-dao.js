const hre = require('hardhat');
const fileReader = require('../utils/fileReader');
const paramsStruct = require('../utils/paramsStruct');
const deploymentResult = fileReader.load('deploy-results/results.json', 'utf8');
const findEventArgs = require('../utils/findEventArgs');

console.log(deploymentResult);
const adamAddress = deploymentResult.addresses.adam;
const deployNetwork = deploymentResult.network;
const {
  ETH_ADDRESS, DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS,
} = fileReader.load(`constant/${deployNetwork}.json`, 'utf-8');

const daoAddresses = [];
const testingDataSet = [{
  lockTime: 0,
  mintMemberToken: true,
  admissionTokens: [[hre.ethers.constants.AddressZero, 0, 0, true]],
  description: '0 lockup, Mint Member Token, No Admission',
}, {
  lockTime: 100,
  mintMemberToken: false,
  admissionTokens: [],
  description: '100 lockup, No Member Token, No Admission',
}, {
  lockTime: 100,
  mintMemberToken: false,
  admissionTokens: [['0xf9559a051478c6a01f20b3c92438023921de51df', 1, 0, false]],
  description: '100 lockup, No Member Token, ERC721 MT',
}, {
  lockTime: 100,
  mintMemberToken: false,
  admissionTokens: [['0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02', 1, 0, false]],
  description: '100 lockup, No Member Token, ERC20 MT',
},
];

async function main () {
  const adam = await hre.ethers.getContractAt('Adam', adamAddress);

  await testingDataSet.reduce(async (p, { lockTime, mintMemberToken, admissionToken, description }) => {
    await p;
    const tx = await adam.createDao(paramsStruct.getCreateDaoParams({
      mintMemberToken,
      admissionToken,
      lockTime,
      depositTokens: [ETH_ADDRESS, DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS],
      baseCurrency: ETH_ADDRESS,
    }));

    const { dao } = await findEventArgs(tx, 'CreateDao');
    daoAddresses.push({ address: dao, description });
  }, Promise.resolve());

  const governFactory = await hre.ethers.getContractAt('GovernFactory', deploymentResult.addresses.governFactory);
  const dao0BudgetGovern = await governFactory.governMap(daoAddresses[0].address, 'BudgetApproval');
  fileReader.save('deploy', 'results.json', {
    ...deploymentResult,
    initdata_addresses: {
      ...deploymentResult.initdata_addresses,
      daos: daoAddresses,
      dao0BudgetGovern,
    },
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
