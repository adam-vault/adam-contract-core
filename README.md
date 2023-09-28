# ADAM Vault Smart Contracts

This repository contains the source codes of the smart contracts developed for the [ADAM Vault Project](https://adamvault.com).

It is currently being actively maintained by the ADAM development team.

For detailed documentation about ADAM Vault, please see https://docs.adamvault.com/

#### Deployment

# Env Vars

| key                 | description                                    |
| ------------------- | ---------------------------------------------- |
| `ETHERSCAN_API_KEY` | API KEY that use to verify contract            |
| `GOERLI_URL`        | Rpc url for goerli                             |
| `POLYGON_URL`       | Rpc url for polygon mainnet                    |
| `MUMBAI_URL`        | Rpc url for polygon mumbai testnet             |
| `MAINNET_URL`       | Rpc url for ethereum mainnet                   |
| `PRIVATE_KEY`       | EOA that depoly the contract                   |
| `REPORT_GAS`        | Rather report the gas when execute transaction |

```
# Install the needed module
npm i

# This will prepare constants based on different network
npm run prepare:<network>

# Compile smart contracts
npm run compile

# Deploy
npx hardhat deploy --network <network>
```

#### Other Commands

```
# Generate interface
npm run interface

# Generate Human Readable API, need to generate interface before
npm run export-abi-human

# Verify contracts on etherscan
npx hardhat etherscan-verify --network <network> --api-key <api-key>
```

## Testing

```
# Run test case
npm run test

# Run coverage
npm run coverage
```

## Audit

That latest smart contract audit was conducted on by HashEx team on September 2022.

[View Audit Report](audits/audit-report-hashex.pdf)
