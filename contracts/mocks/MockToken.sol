// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MockToken is ERC20 {
    constructor() ERC20("TokenA", "A") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}