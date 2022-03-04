const { generateSolidity } = require('abi-to-sol/dist/src');

const fs = require('fs');
const path = require('path');

const genSol = function (path) {
  const json = require(path);
  if (!json.sourceName) return;
  if (!json.sourceName.match(/contracts\/\w+\.sol/g)) return;
  const { abi, contractName } = json;
  const output = generateSolidity({
    abi,
    name: `I${contractName}`,
    solidityVersion: '^0.8.0',
    license: 'GPL-3.0',
  });
  fs.writeFile(
    './contracts/interface/' + `I${contractName}.sol`,
    output,
    function (err) {
      if (err) return console.log(err);
      console.log('./contracts/interface/' + `I${contractName}.sol`);
    }
  );
};

const getAllFiles = function (dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
      genSol(path.join(__dirname, dirPath, '/', file));
    }
  });

  return arrayOfFiles;
};

getAllFiles('./artifacts/contracts');
