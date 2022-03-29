// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract TokenB is ERC20, ERC20Permit, ERC20Votes {
    uint256 total = 100000;

    constructor() ERC20('TokenB', 'B') ERC20Permit('TokenB') {}

    function setTotalSupply(uint256 _total) public {
        total = _total;
    }

    function totalSupply() public view override returns (uint256) {
        return total;
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
        if(from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}