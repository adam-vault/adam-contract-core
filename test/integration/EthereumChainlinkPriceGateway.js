const { expect } = require('chai');
const { ethers } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const findEventArgs = require('../../utils/findEventArgs');
const { createAdam } = require('../utils/createContract.js');

const { getCreateDaoParams } = require('../../utils/paramsStruct');
const { setMockFeedRegistry } = require('../utils/mockFeedRegistryHelper');

const { ADDRESS_ETH } = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', async () => {
    let adam;
    let tokenA;
    let tokenB;
    let creator;
    let daoMember;
    let ethereumChainlinkPriceGateway;
    let dao;

    async function createDao() {
        const tx = await adam.createDao(
            ...getCreateDaoParams({
                name: 'A Company',
                priceGateways: [ethereumChainlinkPriceGateway],
                depositTokens: [ADDRESS_ETH, tokenA.address],
                baseCurrency: ADDRESS_ETH,
                creator: creator.address,
            }),
        );
        const { dao: daoAddr } = await findEventArgs(tx, 'CreateDao');
        return ethers.getContractAt('Dao', daoAddr);
    }

    beforeEach(async () => {
        [creator, daoMember] = await ethers.getSigners();

        tokenA = await getMockERC20Token([
            {
                address: daoMember.address,
                balance: ethers.utils.parseEther('100'),
            },
        ]);
        tokenB = await getMockERC20Token([
            {
                address: daoMember.address,
                balance: ethers.utils.parseEther('100'),
            },
        ]);

        await setMockFeedRegistry([
            {
                token1: tokenA.address,
                token2: ADDRESS_ETH,
                price: ethers.utils.parseEther('0.25'),
                decimal: 18,
            },
            {
                token1: tokenB.address,
                token2: ADDRESS_ETH,
                price: ethers.utils.parseEther('0.25'),
                decimal: 18,
            },
        ]);

        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway.address;

        dao = await createDao();
    });

    describe('CreateDao()', async () => {
        it('creates Dao successfully with correct param', async () => {
            const accountingSystem = await ethers.getContractAt(
                'AccountingSystem',
                await dao.accountingSystem(),
            );
            expect(
                await accountingSystem.priceGateways(
                    ethereumChainlinkPriceGateway,
                ),
            ).to.be.equal(true);
            expect(await accountingSystem.defaultPriceGateway()).to.be.equal(
                ethereumChainlinkPriceGateway,
            );
        });
    });
});

async function getMockERC20Token(addressBalances) {
    const SmockERC20 = await smock.mock('ERC20');
    token = await SmockERC20.deploy('name', 'SYM');
    await Promise.all(
        addressBalances.map(({ address, balance }) =>
            token.setVariable('_balances', { [address]: balance }),
        ),
    );
    return token;
}
