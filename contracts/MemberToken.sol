// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "hardhat/console.sol";

contract MemberToken is ERC20VotesUpgradeable {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == address(owner), "Not owner");
        _;
    }

    function initialize(address _owner, string memory _name, string memory _symbol) public initializer
    {
        owner = _owner;
        __ERC20_init(_name, _symbol);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override
    {
        super._afterTokenTransfer(from, to, amount);
        if(from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function mint(address account, uint256 amount) public onlyOwner
    {
        _mint(account, amount);
    }
}