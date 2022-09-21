
const { faker } = require('@faker-js/faker');
const { constants } = require('ethers');
const { ethers } = require('hardhat');
const daoV2Artifact = require('../artifacts/contracts/v2/DaoV2.sol/DaoV2.json');

const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function getCreateDaoParams ({
  // defaut Dao Setting
  name = faker.company.companyName(),
  description = faker.commerce.productDescription(),
  lockTime = 0,
  generalGovernSetting = [300, 3000, 5000, 0],
  tokenInfo = [`${faker.company.companyName()}Token`, 'MT'],
  tokenAmount = 100,
  minDepositAmount = 0,
  depositTokens = [ETH],
  mintMemberToken = false,
  admissionTokens = [],
  baseCurrency = ETH,
  logoCID = '',
  maxMemberLimit = ethers.constants.MaxUint256,
}) {
  return Object.entries({
    name,
    description,
    lockTime,
    generalGovernSetting,
    tokenInfo,
    tokenAmount,
    minDepositAmount,
    depositTokens,
    mintMemberToken,
    admissionTokens,
    baseCurrency,
    logoCID,
    maxMemberLimit,
  }).map(([key, value]) => {
    return value;
  });
};

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
  team,
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
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    allowAllTokens: allowAllTokens ?? token === ethers.constants.AddressZero,
    token,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateDaoParamsV2 ({
  // defaut Dao Setting
  name = faker.company.companyName(),
  description = faker.commerce.productDescription(),
  lockTime = 0,
  generalGovernSetting = [300, 3000, 5000, 0],
  tokenName = `${faker.company.companyName()}Token`,
  tokenSymbol = 'MT',
  tokenAmount = 100,
  minDepositAmount = 0,
  depositTokens = [ETH],
  mintMemberToken = false,
  admissionTokens = [],
  baseCurrency = ETH,
  logoCID = '',
  maxMemberLimit = ethers.constants.MaxUint256,
}) {
  const iface = new ethers.utils.Interface(daoV2Artifact.abi);

  return [
    Object.values({
      name,
      description,
      baseCurrency,
      maxMemberLimit,
      tokenName,
      tokenSymbol,
      depositTokens,
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
  team,
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
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    tokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateLiquidUniswapBAParams ({
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Liquid Uniswap',
  transactionType = 'swapLiquid',
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
  team,
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
  allowAllFromTokens,
  fromToken = ethers.constants.AddressZero,
  allowAllToTokens,
  toTokens = [],
  allowAnyAmount,
  totalAmount = 0,
  amountPercentage = 100,
  team,
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
    allowAllFromTokens: allowAllFromTokens ?? fromToken === ethers.constants.AddressZero,
    fromToken,
    allowAllToTokens: allowAllToTokens ?? toTokens.length === 0,
    toTokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
    amountPercentage,
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
  team,
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
    allowAllAddresses: allowAllAddresses ?? toAddresses.length === 0,
    toAddresses,
    allowAllTokens: allowAllTokens ?? tokens.length === 0,
    tokens,
    allowAnyAmount: allowAnyAmount ?? totalAmount === 0,
    totalAmount,
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
  team = ethers.constants.AddressZero,
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
    team,
  }).map(([key, value]) => {
    return value;
  });
}

module.exports = {
  getCreateDaoParams,
  getCreateDaoParamsV2,
  getCreateTransferERC20BAParams,
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateLiquidUniswapBAParams,
  getCreateTransferERC721BAParams,
  getCreateUniswapBAParams,
};
