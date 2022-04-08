const { ethers } = require('hardhat');
const { expect } = require('chai');
const _ = require('lodash');

const { createAdam } = require('../utils/createContract');


describe('UniswapSwapper.sol', () => {
  let decode;

  const ETHAddress = '0x0000000000000000000000000000000000000000';
  const WETHAddress = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
  const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';
  const UNIAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
  const UniswapRouter = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

  before(async () => {
    const adam = await createAdam();
    await adam.createDao(
        [
            'A Company',  //_name
            'Description', //_description
            10000000, //_locktime
            false, //isCreateToken
            [13, 3000, 5000, 0], //budgetApproval
            [13, 3000, 5000, 0], //revokeBudgetApproval
            [13, 3000, 5000, 0], //general,
            [13, 3000, 5000, 0], //daoSetting
            [], //tokenInfo
            0,
        ]
    );
    const daoAddr = await adam.daos(0);
    const dao = await ethers.getContractAt('Dao', daoAddr);
    const uniswapBAImplementationAddr = await adam.budgetApprovals(1);
    const uniswapBAImplementation = await ethers.getContractAt('UniswapBudgetApproval', uniswapBAImplementationAddr);
    const initData = await uniswapBAImplementation.callStatic['encodeUniswapInitializeData((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8),bool,address[])'](
      [
        // dao address
        dao.address,
        // executor
        ethers.constants.AddressZero,
        // approvers
        [],
        // text
        'Uniswap',
        // transaction type
        'Swap',
        // allow all addresses,
        true,
        // allowed addresses (use when above = false)
        [],
        // alow all tokens,
        true,
        // allowed token (use when above = false)
        [],
        // allow any amount
        true,
        // allowed total amount
        ethers.utils.parseEther('0'),
        // allowed amount percentage
        '100',
      ],
      true,
      [],
    );
    const tx = await dao.createBudgetApprovals(
      [uniswapBAImplementationAddr], [initData],
    );
    const receipt = await tx.wait();
    const creationEventLog = _.find(receipt.events, { event: 'CreateBudgetApproval' });
    const budgetApprovalAddress = creationEventLog.args.budgetApproval;

    const contract = await ethers.getContractAt('UniswapBudgetApproval', budgetApprovalAddress);
    decode = contract.decode;
  });

  it('decode transaction data', async () => {
    context('decode WETH9', async () => {
      it('ETH => WETH', async () => {
        const msgValue = ethers.utils.parseEther('0.1');
        const data = '0xd0e30db0';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(WETHAddress, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(WETHAddress);
        expect(amountIn).to.equal(msgValue);
        expect(amountOut).to.equal(msgValue);
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(false);
      });

      it('WETH => ETH', async () => {
        const msgValue = ethers.utils.parseEther('0.1');
        const data = '0x2e1a7d4d';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(WETHAddress, data, msgValue);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountIn).to.equal(msgValue);
        expect(amountOut).to.equal(msgValue);
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(false);
      });
    });

    context('decode V2 Uniswap Router', async () => {
      it('ETH (exact) => DAI', async () => {
        const msgValue = ethers.utils.parseEther('0.1');
        const data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000621360a200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005db3338b89c8ee48136867a9ff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(msgValue);
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('ETH => DAI (exact)', async () => {
        const msgValue = ethers.utils.parseEther('0.13571596');
        const data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000621368ac000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000007e37be2022c0914b268000000000000000000000000000000000000000000000000000000001e228da0ade2bfa0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('10000000000000'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('WETH (exact) => DAI', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006213709500000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e4472b43f3000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000005e61879db2759f54b0e3995c000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('0.1'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('WETH => DAI (exact)', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006213712b00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000001645545a09fc3520000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('7500000000000'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('UNI (exact) => ETH', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000000000000000021b63d50268a5d80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c000000000000000000000000000000000000000000000000021b63d50268a5d8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(UNIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('0.06'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('UNI => ETH (exact)', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214e0cd000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a670000000000000000000000000000000000000000000000000214e8348c4f000000000000000000000000000000000000000000000000000000d299cbd738c56a0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000214e8348c4f0000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(UNIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('0.15'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });
    });

    context('decode V3 Uniswap Router', async () => {
      it('ETH (exact) => DAI', async () => {
        const msgValue = ethers.utils.parseEther('0.1');
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006213634600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(msgValue);
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('ETH => DAI (exact)', async () => {
        const msgValue = ethers.utils.parseEther('0.0000000000013459');
        const data = '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136662000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000000000000000000000000000000000000014891d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('100'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('WETH (exact) => DAI', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006213722a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000acd640142a980d9a6ed709ba5d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('0.1'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('WETH => DAI (exact)', async () => {
        const data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000621372b100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc473500000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000005ea9ce981a106cf85ce000000000000000000000000000000000000000000000000000000000bf36a94c9f363f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('7500000000000'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('DAI (exact) => ETH', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214688d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc4735000000000000000000000000c778417e063141139fce010982780140aa0cd5ab0000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000000000000145fd1000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(DAIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('100'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('UNI => ETH (exact)', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214df38000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e45023b4df0000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f984000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000023e33e5347d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(UNIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('0.0001'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });
    });

    context('decode hybrid (V2 + V3) Uniswap Router', async () => {
      it('ETH (exact) => DAI', async () => {
        const msgValue = ethers.utils.parseEther('0.3');
        const data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000621362ec000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f30000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000000000000000000e06c72447c78d7d9f8bf7a79340000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000d529ae9e860000000000000000000000000000000000000000003836e4c2245dba427297bea15c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(msgValue);
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('ETH => DAI (exact)', async () => {
        const msgValue = ethers.utils.parseEther('0.20347979');
        const data = '0x5ae401dc0000000000000000000000000000000000000000000000000000000062136a14000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000008dfeb5e42718a3748b50000000000000000000000000000000000000000000000000000000021e8ff2205824150000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000002710000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000002f54e74c0d08367c2e7000000000000000000000000000000000000000000000000000000000b457c1647f3acc000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, msgValue);

        expect(tokenIn).to.equal(ETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('15000000000000'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('WETH (exact) => DAI', async () => {
        const data = '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146734000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e4472b43f300000000000000000000000000000000000000000000000001cdda4faccd000000000000000000000000000000000000000000780b6875d526532ce7c61e92a00000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000f8b0a10e4700000000000000000000000000000000000000000040de0ac17b104f9a943a869485000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('0.2'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('WETH => DAI (exact)', async () => {
        const data = '0x5ae401dc0000000000000000000000000000000000000000000000000000000062146545000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e442712a67000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f29597c26d49cf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc1630000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e45023b4df000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc163000000000000000000000000000000000000003f1bdf10116048a5934000000000000000000000000000000000000000000000000000000000f1eab8757de498000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(WETHAddress);
        expect(tokenOut).to.equal(DAIAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('10000000000000'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });

      it('UNI (exact) => ETH', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214cd6600000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000104472b43f30000000000000000000000000000000000000000000000000005543df729c000000000000000000000000000000000000000000000000000000f82b3a947a1b10000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000c6f3b40b6c00000000000000000000000000000000000000000000000000000237c024ad815be00000000000000000000000000000000000000000000000000000000000000421f9840a85d5af5bf1d1762f925bdaddc4201f984000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735002710c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c0000000000000000000000000000000000000000000000000032feb5f41fb76f000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(UNIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountIn).to.equal(ethers.utils.parseEther('0.005'));
        expect(estimatedIn).to.equal(false);
        expect(estimatedOut).to.equal(true);
      });

      it('UNI => ETH (exact)', async () => {
        const data = '0x5ae401dc000000000000000000000000000000000000000000000000000000006214a2ba00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010442712a67000000000000000000000000000000000000000000000000000ffcb9e57d4000000000000000000000000000000000000000000000000000000475b84cdb53f90000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000005592ec0cfb4dbc12d3ab100b257153436a1f0fea000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012409b8134600000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000254db1c2244000000000000000000000000000000000000000000000000000000a8bdae12a333f0000000000000000000000000000000000000000000000000000000000000042c778417e063141139fce010982780140aa0cd5ab000bb8c7ad46e0b8a400bb3c915120d284aafba8fc4735000bb81f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004449404b7c00000000000000000000000000000000000000000000000000354a6ba7a18000000000000000000000000000bfaa947b65a4350f14895980d0c8f420576fc16300000000000000000000000000000000000000000000000000000000';

        const [tokenIn, tokenOut, amountIn, amountOut, estimatedIn, estimatedOut] = await decode(UniswapRouter, data, 0);

        expect(tokenIn).to.equal(UNIAddress);
        expect(tokenOut).to.equal(ETHAddress);
        expect(amountOut).to.equal(ethers.utils.parseEther('0.015'));
        expect(estimatedIn).to.equal(true);
        expect(estimatedOut).to.equal(false);
      });
    });
  });
});
