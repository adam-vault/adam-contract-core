// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "hardhat/console.sol";

contract MemberToken is ERC20VotesUpgradeable {
    address public minter;

    modifier onlyMinter() {
        require(msg.sender == address(minter), "Not minter");
        _;
    }

    function initialize(
        address _minter,
        string memory _name,
        string memory _symbol
    ) public initializer {
        minter = _minter;
        __ERC20_init(_name, _symbol);
    }

    function mint(
        address account,
        uint256 amount
    ) public onlyMinter {
        _mint(account, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._afterTokenTransfer(from, to, amount);

        _delegate(to, to);
    }

    function getPastTotalSupply(uint256 blockNumber) public view override returns (uint256) {
        return super.getPastTotalSupply(blockNumber) - super.getPastVotes(minter, blockNumber);
    }

    function getPastVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        if(account == minter) return 0;
        return super.getPastVotes(account, blockNumber);
    }

    function getVotes(address account) public view virtual override returns (uint256) {
        if(account == minter) return 0;
        return super.getVotes(account);
    }

}