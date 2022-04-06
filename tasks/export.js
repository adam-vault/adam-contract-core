// const { extendConfig, extendEnvironment } = require('hardhat/config');
const util = require('util');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const minimatch = require('minimatch');

const globPromise = util.promisify(glob);
const writeFile = util.promisify(fs.writeFile);

async function exportABI ({
  artifacts = './artifacts/contracts',
  contracts = 'contracts/*.sol',
  outputPath = './contracts/interface',
}) {
  const files = await globPromise(path.join(__dirname, '..', artifacts, '/', '**/*.json'));

  const matchedFiles = files.filter((filepath) => {
    const { sourceName } = require(filepath);
    return sourceName && minimatch(sourceName, contracts);
  });

  return Promise.all(matchedFiles.map(async (filepath) => {
    const { abi, contractName } = require(filepath);


    // const abis = abi.map((func) => {
    //   if (func.type === 'event') {
    //     const inputs = (func.inputs || []).map(i => (i.indexed ? [i.type, 'indexed', i.name] : [i.type, i.name]).join(','));
    //     return `${func.type} ${func.name}(${inputs})`;
    //   } else {
    //     const inputs = (func.inputs || []).map(i => (i.indexed ? [i.type, 'indexed', i.name] : [i.type, i.name]).join(','));
    //     const isView = func.stateMutability === 'view';
    //     const isPayable = func.stateMutability === 'payable';
    //     const returns = (func.outputs || []).length
    //       ? 'returns (' + func.outputs.map(o => `${o.type}${o.name ? ` ${o.name}` : ''}`).join(',') + ')'
    //       : '';
    //     return `${func.type} ${func.name}(${inputs}) ${isPayable ? 'payable ' : ''}${isView ? 'view ' : ''}${returns}`;
    //   }
    // });
    await writeFile(path.join(__dirname, '..', outputPath, '/', `${contractName}.json`), JSON.stringify(abi, null, 2));
  }));
};
task('export', 'Generate abi for contracts', async function (args, hre) {
  return exportABI({
    artifacts: './artifacts/contracts',
    contracts: 'contracts/*.sol',
    outputPath: './abis',
  });
});
