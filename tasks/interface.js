// const { extendConfig, extendEnvironment } = require('hardhat/config');
const { generateSolidity } = require('abi-to-sol/dist/src');
const util = require('util');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const minimatch = require('minimatch');

const globPromise = util.promisify(glob);
const writeFile = util.promisify(fs.writeFile);

async function generateInterface ({
  artifacts = './artifacts/contracts',
  contracts = 'contracts/*.sol',
  outputPath = './contracts/interface',
  prefix = 'I',
  solidityVersion,
  license,
}) {
  const files = await globPromise(path.join(__dirname, '..', artifacts, '/', '**/*.json'));

  const matchedFiles = files.filter((filepath) => {
    const { sourceName } = require(filepath);
    return sourceName && minimatch(sourceName, contracts);
  });

  return Promise.all(matchedFiles.map(async (filepath) => {
    const { abi, contractName } = require(filepath);
    const name = `${prefix}${contractName}`;

    // workaround for handling generate struct interface
    const updatedAbi = JSON.parse(JSON.stringify(abi).replace(/struct /gi, `struct ${prefix}`));

    const output = generateSolidity({ abi: updatedAbi, name, solidityVersion, license });
    console.log('Generated interface:', `${name}.sol`);
    await writeFile(path.join(__dirname, '..', outputPath, '/', `${name}.sol`), output);
    return path.join(__dirname, '..', outputPath, '/', `${name}.sol`);
  }));
};

task('interface', 'Generate interface for contracts', async function (args, hre) {
  return generateInterface({
    artifacts: './artifacts/contracts',
    contracts: 'contracts/*.sol',
    outputPath: './contracts/interface',
    solidityVersion: '^0.8.0',
    license: 'GPL-3.0',
  });
});
