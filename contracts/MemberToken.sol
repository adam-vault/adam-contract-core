// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MemberToken is Initializable, ERC20VotesUpgradeable, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol) external initializer {
	    __Ownable_init();
        __ERC20Permit_init(_name);
        __ERC20_init(_name, _symbol);
    }

    function mint(
        address account,
        uint256 amount
    ) external onlyOwner {
        _mint(account, amount);
    }

    function mintToOwner(
        uint256 amount
    ) external onlyOwner {
        _mint(owner(), amount);
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
        return super.getPastTotalSupply(blockNumber) - super.getPastVotes(owner(), blockNumber);
    }

    function getPastVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        if(account == owner()) return 0;
        return super.getPastVotes(account, blockNumber);
    }

    function getVotes(address account) public view virtual override returns (uint256) {
        if(account == owner()) return 0;
        return super.getVotes(account);
    }

    function delegate(address) public virtual override {
        revert("Not support delegate Vote");
    }
    function delegateBySig(
        address,
        uint256,
        uint256,
        uint8,
        bytes32,
        bytes32
    ) public virtual override {
        revert("Not support delegate Vote");
    }

    uint256[50] private __gap;
}