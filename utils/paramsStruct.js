
const { faker } = require('@faker-js/faker');
const { constants } = require('ethers');
const { ethers } = require('hardhat');

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
  dao,
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
  allowAllAddresses = true,
  toAddresses = [],
  allowAllTokens = true,
  token = ethers.constants.AddressZero,
  allowAnyAmount = true,
  totalAmount = '0',
  amountPercentage = '100',
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
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
    allowAllAddresses,
    toAddresses,
    allowAllTokens,
    token,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateTransferLiquidErc20TokenBAParams ({
  dao,
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
  allowAllAddresses = true,
  toAddresses = [],
  tokens = [],
  allowAnyAmount = true,
  totalAmount = 0,
  amountPercentage = 100,
  baseCurrency = ETH,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
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
    allowAllAddresses,
    toAddresses,
    tokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateUniswapBAParams ({
  dao,
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
  allowAllToTokens = true,
  toTokens = [],
  allowAnyAmount = true,
  totalAmount = 0,
  amountPercentage = 100,
  baseCurrency = ETH,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
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
    allowAllToTokens,
    toTokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateTransferERC721BAParams ({
  dao,
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
  allowAllAddresses = true,
  toAddresses = [],
  allowAllTokens = true,
  tokens = [],
  allowAnyAmount = true,
  totalAmount = 0,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
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
    allowAllAddresses,
    toAddresses,
    allowAllTokens,
    tokens,
    allowAnyAmount,
    totalAmount,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateCommonBudgetApprovalParams ({
  dao,
  executor = ethers.constants.AddressZero,
  executorTeamId = 0,
  approvers = [],
  approverTeamId = 0,
  minApproval = 0,
  text,
  transactionType,
  startTime = 0,
  endTime = constants.MaxUint256,
  allowUnlimitedUsageCount = true,
  usageCount = 0,
  team = ethers.constants.AddressZero,
}) {
  return Object.entries({
    dao,
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
  }).map(([key, value]) => {
    return value;
  });
}
module.exports = {
  getCreateDaoParams,
  getCreateTransferERC20BAParams,
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateUniswapBAParams,
  getCreateTransferERC721BAParams,
};
