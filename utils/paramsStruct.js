
const { constants } = require('ethers');
const { ethers } = require('hardhat');
const daoArtifact = require('../artifacts/contracts/Dao.sol/Dao.json');

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
}) {
  const iface = new ethers.utils.Interface(daoArtifact.abi);

  return [
    Object.values({
      name,
      description,
      baseCurrency,
      maxMemberLimit,
      tokenName,
      tokenSymbol,
      depositTokens,
      referer,
    }),
    [
      lockTime ? iface.encodeFunctionData('setLocktime', [lockTime]) : '',
      minDepositAmount ? iface.encodeFunctionData('setMinDepositAmount', [minDepositAmount]) : '',
      iface.encodeFunctionData('createGovern', ['General', ...generalGovernSetting]),
      tokenAmount ? iface.encodeFunctionData('mintMemberToken', [tokenAmount]) : '',
      logoCID ? iface.encodeFunctionData('setLogoCID', [logoCID]) : '',
      ...admissionTokens.map(([token, minTokenToAdmit, tokenId, isMemberToken]) => {
        if (isMemberToken) {
          return iface.encodeFunctionData('setMemberTokenAsAdmissionToken', [minTokenToAdmit]);
        }
        return iface.encodeFunctionData('addAdmissionToken', [token, minTokenToAdmit, tokenId]);
      }),
    ].filter((str) => !!str),
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
  getCreateUniswapBAParams,
  getCreateTransferERC721BAParams,
  getCreateBasicBudgetApprovalParams,
};
