const { ethers } = require('hardhat');
const uniswapRouterArticfact = require('../../artifacts/contracts/mocks/MockUniswapV3Router.sol/MockUniswapV3Router');
const { ADDRESS_UNISWAP_ROUTER } = require('../utils/constants');

module.exports = {
    setMockUniswapRouter: async () => {
        await ethers.provider.send('hardhat_setCode', [
            ADDRESS_UNISWAP_ROUTER,
            uniswapRouterArticfact.deployedBytecode,
        ]);
        return ethers.getContractAt(
            'MockUniswapV3Router',
            ADDRESS_UNISWAP_ROUTER,
        );
    },
};
