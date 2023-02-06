
const { constants } = require('ethers');
const { ethers } = require('hardhat');
const daoArtifact = require('../artifacts/contracts/Dao.sol/Dao.json');
const membershipArtifact = require('../artifacts/contracts/Membership.sol/Membership.json');
const memberTokenArtifact = require('../artifacts/contracts/MemberToken.sol/MemberToken.json');
const liquidPoolArtifact = require('../artifacts/contracts/LiquidPool.sol/LiquidPool.json');
const teamArtifact = require('../artifacts/contracts/Team.sol/Team.json');
const accountingSystemArtifact = require('../artifacts/contracts/AccountingSystem.sol/AccountingSystem.json');

const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function getCreateTransferERC20BAParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Transfer Illiquid Token',
  transactionType = 'outflow',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses,
  toAddresses = [],
  allowAllTokens,
  token = ethers.constants.AddressZero,
  allowAnyAmount,
  totalAmount = 0,
  toTeamIds = [],
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    allowAllTokens: allowAllTokens ?? token === ethers.constants.AddressZero,
    token,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    toTeamIds,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateDaoParams ({
  // defaut Dao Setting
  name = 'Company Name',
  description = 'Description',
  lockTime = 0,
  generalGovernSetting = [300, 3000, 5000, 0, constants.AddressZero, 5],
  tokenName = 'Member Token',
  tokenSymbol = 'MT',
  tokenAmount = 100,
  minDepositAmount = 0,
  depositTokens = [ETH],
  admissionTokens = [],
  baseCurrency = ETH,
  logoCID = '',
  maxMemberLimit = ethers.constants.MaxUint256,
  referer = constants.AddressZero,
  creator,
  priceGateways = [],
}) {
  const iface = new ethers.utils.Interface(daoArtifact.abi);
  const membershipIface = new ethers.utils.Interface(membershipArtifact.abi);
  const memberTokenIface = new ethers.utils.Interface(memberTokenArtifact.abi);
  const liquidPoolIface = new ethers.utils.Interface(liquidPoolArtifact.abi);
  const teamIface = new ethers.utils.Interface(teamArtifact.abi);
  const accountingSystemIface = new ethers.utils.Interface(accountingSystemArtifact.abi);

  return [
    name,
    description,
    baseCurrency,
    [
      iface.encodeFunctionData('createPlugin', [
        ethers.utils.id('adam.dao.membership'),
        membershipIface.encodeFunctionData('initialize', [name, maxMemberLimit]),
      ]),
      iface.encodeFunctionData('createPlugin', [
        ethers.utils.id('adam.dao.accounting_system'),
        accountingSystemIface.encodeFunctionData('initialize', [priceGateways]),
      ]),
      iface.encodeFunctionData('createPlugin', [
        ethers.utils.id('adam.dao.liquid_pool'),
        liquidPoolIface.encodeFunctionData('initialize', [depositTokens, baseCurrency]),
      ]),
      iface.encodeFunctionData('createPlugin', [
        ethers.utils.id('adam.dao.member_token'),
        memberTokenIface.encodeFunctionData('initialize', [tokenName, tokenSymbol]),
      ]),
      iface.encodeFunctionData('createPlugin', [
        ethers.utils.id('adam.dao.team'),
        teamIface.encodeFunctionData('initialize', []),
      ]),
      lockTime ? iface.encodeFunctionData('setLocktime', [lockTime]) : '',
      minDepositAmount ? iface.encodeFunctionData('setMinDepositAmount', [minDepositAmount]) : '',
      iface.encodeFunctionData('createGovern', [
        'General',
        generalGovernSetting[1],
        generalGovernSetting[2],
        generalGovernSetting[3],
        generalGovernSetting[4],
        generalGovernSetting[5],
      ]),
      creator
        ? iface.encodeFunctionData('executePlugin', [
          ethers.utils.id('adam.dao.membership'),
          membershipIface.encodeFunctionData('createMember', [creator]),
          0,
        ])
        : '',
      tokenAmount
        ? iface.encodeFunctionData('executePlugin', [
          ethers.utils.id('adam.dao.member_token'),
          memberTokenIface.encodeFunctionData('mintToOwner', [tokenAmount]),
          0,
        ])
        : '',
      logoCID ? iface.encodeFunctionData('setLogoCID', [logoCID]) : '',

      ...admissionTokens.map(([token, minTokenToAdmit, tokenId, isMemberToken]) => {
        if (isMemberToken) {
          return iface.encodeFunctionData('executePlugin', [
            ethers.utils.id('adam.dao.membership'),
            membershipIface.encodeFunctionData('setMemberTokenAsAdmissionToken', [minTokenToAdmit]),
            0,
          ]);
        }
        return iface.encodeFunctionData('executePlugin', [
          ethers.utils.id('adam.dao.membership'),
          membershipIface.encodeFunctionData('addAdmissionToken', [token, minTokenToAdmit, tokenId]),
          0,
        ]);
      }),
    ].filter((str) => !!str),
    referer,
  ];
};

function getCreateTransferLiquidErc20TokenBAParams ({
  executor,
  executorTeamId,
  approvers = [],
  approverTeamId,
  minApproval = 0,
  text = 'Transfer Liquid ERC20 Token',
  transactionType = 'outflowLiquid',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses,
  toAddresses = [],
  tokens = [],
  allowAnyAmount,
  totalAmount = 0,
  baseCurrency = ETH,
  toTeamIds = [],
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    tokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    baseCurrency,
    toTeamIds,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateSelfClaimErc20TokenBAParams ({
  executor,
  executorTeamId,
  approvers = [],
  approverTeamId,
  minApproval = 0,
  text = 'Self Claim ERC20 Token',
  transactionType = 'selfClaimERC20',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses,
  toAddresses = [],
  token,
  allowAllTokens = true,
  fixAmount = 0,
  validator = '0x0000000000000000000000000000000000000000',
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    allowAllTokens,
    token,
    fixAmount,
    validator,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateUniswapBAParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Uniswap',
  transactionType = 'swap',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  fromTokens = [],
  allowAllToTokens,
  toTokens = [],
  allowAnyAmount,
  totalAmount = 0,
  amountPercentage = 100,
  baseCurrency = ETH,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    fromTokens,
    allowAllToTokens: allowAllToTokens ?? toTokens.length === 0,
    toTokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    amountPercentage,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateTransferERC721BAParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Transfer ERC721',
  transactionType = '721outflow',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses,
  toAddresses = [],
  allowAllTokens,
  tokens = [],
  allowAnyAmount,
  totalAmount = 0,
  toTeamIds = [],
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    allowAllTokens: allowAllTokens ?? tokens.length === 0,
    tokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    toTeamIds,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateVestingERC20BAParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Vesting ERC20 Token',
  transactionType = 'vesting',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  team,
  token,
  toAddress,
  cliffPeriod,
  cyclePeriod,
  cycleCount,
  cycleTokenAmount,
  initTokenAmount,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
      team,
    }),
    token,
    toAddress,
    cliffPeriod,
    cyclePeriod,
    cycleCount,
    cycleTokenAmount,
    initTokenAmount,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateCommonBudgetApprovalParams ({
  executor = ethers.constants.AddressZero,
  executorTeamId = 0,
  approvers = [],
  approverTeamId = 0,
  minApproval = 0,
  text,
  transactionType,
  startTime = 0,
  endTime = constants.MaxUint256,
  allowUnlimitedUsageCount,
  usageCount = 0,
}) {
  return Object.entries({
    executor,
    executorTeamId,
    approvers,
    approverTeamId,
    minApproval,
    text,
    transactionType,
    startTime,
    endTime,
    allowUnlimitedUsageCount: allowUnlimitedUsageCount ?? usageCount === 0,
    usageCount,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateBasicBudgetApprovalParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Transfer ERC721',
  transactionType = '721outflow',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
}) {
  return [getCreateCommonBudgetApprovalParams({
    executor,
    executorTeamId,
    approvers,
    approverTeamId,
    minApproval,
    text,
    transactionType,
    startTime,
    endTime,
    allowUnlimitedUsageCount,
    usageCount,
  })];
}
module.exports = {
  getCreateDaoParams,
  getCreateTransferERC20BAParams,
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateSelfClaimErc20TokenBAParams,
  getCreateUniswapBAParams,
  getCreateTransferERC721BAParams,
  getCreateVestingERC20BAParams,
  getCreateBasicBudgetApprovalParams,
};
