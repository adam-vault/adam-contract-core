# ADAM Vault Smart Contracts

This repository contains the source codes of the smart contracts developed for the [ADAM Vault Project](https://adamvault.com). It is currently being actively maintained by the ADAM development team. 

For detailed documentation about ADAM Vault, please see https://docs.adamvault.com/

## Usage

#### Deployment
```
# This will prepare constants based on different network
npm run prepare:<network>

# Compile smart contracts
npm run compile

# Deploy
npx hardhat deploy --network <network>
```

#### Other Commands
```
# Generate Human Readable API
npx hardhat export-abi-human

# Verify contracts on etherscan
npx hardhat etherscan-verify --network <network>
```


## Audit
That latest smart contract audit was conducted on by HashEx team on September 2022.

[View Audit Report](audits/audit-report-hashex.pdf)
