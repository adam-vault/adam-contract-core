const hre = require('hardhat');
const { faker } = require('@faker-js/faker');

// rinkeby
const governAddress = '0x25cC6C6C32FF04b3460FDB19CA053ee919d7b874';
const daoAddress = '0xA3183A78A3E5bEe6Bb44022B6CB806Ee4ECAa688';
const transferERC20BudgetApprovalAddress = '0x60EA35bB45019d1fa3cAE7FEFd6445aC9Fa3B608';
const uniswapBudetApprovalAddress = '0x16a08c8fD57C90A55713b26ccc49A10ba14856c6';
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

async function main () {
  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);

  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataERC20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [[
      // dao address
      daoAddress,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // approvers
      ['0x525BaB223a5F7D3E81699995DaA92fAe7329C5D9'],
      // minApproval
      1,
      // text
      'Transfer ERC20',
      // transaction type
      'Outflow',
      // allow all addresses,
      false,
      // allowed addresses (use when above = false)
      ['0xBfAA947b65A4350f14895980D0c8f420576fC163'],
      // allowed token
      [DAIAddress],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '1000',
      // start time
      Math.round(Date.now() / 1000) - 86400,
      // end time
      Math.round(Date.now() / 1000) + 86400,
    ]]);

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize((address,address,address[],uint256,string,string,bool,address[],bool,address[],bool,uint256,uint8,uint256,uint256),bool,address[])',
    [
      // common params
      [
      // dao address
        daoAddress,
        // executor
        '0xBfAA947b65A4350f14895980D0c8f420576fC163',
        // approvers
        [],
        // minApproval
        0,
        // text
        'Uniswap',
        // transaction type
        'Swap',
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
        // allowed token
        [hre.ethers.constants.AddressZero],
        // allow any amount
        true,
        // allowed total amount
        hre.ethers.utils.parseEther('0'),
        // allowed amount percentage
        '10000',
        // start time
        Math.round(Date.now() / 1000) - 86400,
        // end time
        Math.round(Date.now() / 1000) + 86400,
      ],
      // extra params
      // allow all to tokens,
      true,
      // allowed to token (use when above = false)
      [],
    ]);

  const calldata = dao.interface.encodeFunctionData('createBudgetApprovals', [
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap],
  ]);
  await govern.propose([daoAddress], [0], [calldata], faker.commerce.productDescription());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
