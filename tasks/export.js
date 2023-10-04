// const { extendConfig, extendEnvironment } = require('hardhat/config');
const util = require('util');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const minimatch = require('minimatch');

const globPromise = util.promisify(glob);
const writeFile = util.promisify(fs.writeFile);

async function exportABI(
    {
        artifacts = './artifacts/contracts',
        contracts = 'contracts/*.sol',
        outputPath = './contracts/interface',
    },
    hre,
) {
    const files = await globPromise(
        path.join(__dirname, '..', artifacts, '/', '**/*.json'),
    );

    const matchedFiles = files.filter((filepath) => {
        const { sourceName } = require(filepath);
        return sourceName && minimatch(sourceName, contracts);
    });

    return Promise.all(
        matchedFiles.map(async (filepath) => {
            const { abi, contractName } = require(filepath);

            const iface = new hre.ethers.utils.Interface(abi);
            const formattedAbi = iface.format(
                hre.ethers.utils.FormatTypes.full,
            );

            await writeFile(
                path.join(
                    __dirname,
                    '..',
                    outputPath,
                    '/',
                    `${contractName}.json`,
                ),
                JSON.stringify(formattedAbi, null, 2),
            );
        }),
    );
}
task(
    'export-abi-human',
    'Generate Human Readable ABIs for contracts',
    async (args, hre) => {
        if (!fs.existsSync('./abis/human')) {
            fs.mkdirSync('./abis/human');
        }
        return exportABI(
            {
                artifacts: './artifacts/contracts',
                contracts: 'contracts/{base,}/*.sol',
                outputPath: './abis/human',
            },
            hre,
        );
    },
);
