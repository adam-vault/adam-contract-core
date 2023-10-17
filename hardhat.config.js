require('dotenv').config();
require('hardhat-deploy');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-toolbox');
require('solidity-coverage');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('hardhat-test-utils');
require('hardhat-storage-layout');

require('./tasks/interface');
require('./tasks/export');
require('./tasks/decodeUniswap');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 *
 * Why need storageLayout
 * `smoddit` requires access to the internal storage layout of your smart contracts.
 * The Solidity compiler exposes this via the `storageLayout` flag, which you need to enable at your hardhat config.
 */

const goerliConfig = {
    chainId: 5,
    url: process.env.GOERLI_URL || '',
    accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    verify: {
        etherscan: 'https://goerli.etherscan.io',
    },
};

const mumbaiConfig = {
    chainId: 80001,
    url: process.env.MUMBAI_URL || '',
    accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    verify: {
        etherscan: 'https://mumbai.polygonscan.com/',
    },
};

module.exports = {
    defaultNetwork: 'hardhat',
    solidity: {
        version: '0.8.7',
        settings: {
            outputSelection: {
                '*': {
                    '*': ['storageLayout'],
                },
            },
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        mainnet: {
            chainId: 1,
            url: process.env.MAINNET_URL || '',
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        polygon: {
            chainId: 137,
            url: process.env.POLYGON_URL || '',
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },

        'goerli-predev': goerliConfig,
        'goerli-dev': goerliConfig,
        'goerli-qa': goerliConfig,
        'goerli-stg': goerliConfig,
        'goerli-alpha': goerliConfig,
        'mumbai-predev': mumbaiConfig,
        'mumbai-dev': mumbaiConfig,
        'mumbai-qa': mumbaiConfig,
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: 'USD',
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    mocha: {
        timeout: 10000000,
    },
    verify: {
        etherscan: {
            apiKey: process.env.ETHERSCAN_API_KEY,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
};
