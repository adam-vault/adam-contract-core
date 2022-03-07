const { generateSolidity } = require('abi-to-sol/dist/src');

const fs = require('fs');
const glob = require('glob');
const minimatch = require('minimatch');

const getAllFiles = function ({
  artifacts = './artifacts/contracts',
  contracts = 'contracts/*.sol',
  outputPath = './contracts/interface',
  prefix = 'I',
  solidityVersion,
  license,
}) {
  glob(`${artifacts}/**/*.json`, function (err, files) {
    if (err) return console.log(err);
    files.forEach((path) => {
      const json = require(path);
      if (!json.sourceName) return;
      if (!minimatch(json.sourceName, contracts)) return;
      const { abi, contractName } = json;
      const outputContractName = `${prefix}${contractName}`;
      const output = generateSolidity({
        abi,
        name: outputContractName,
        solidityVersion,
        license,
      });
      fs.writeFile(
        `${outputPath}/${outputContractName}.sol`,
        output,
        function (err) {
          if (err) return console.log(err);
          console.log(`${outputPath}/${outputContractName}.sol`);
        },
      );
    });
  });
};

getAllFiles({
  artifacts: './artifacts/contracts',
  contracts: 'contracts/*.sol',
  outputPath: './contracts/interface',
  solidityVersion: '^0.8.0',
  license: 'GPL-3.0',
});
