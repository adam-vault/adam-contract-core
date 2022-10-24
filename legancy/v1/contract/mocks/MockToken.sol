// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MockToken is ERC20 {
    uint8 private _decimals;
    constructor() ERC20("TokenA", "A") {
        _decimals = 18;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function setDecimals(uint8 decmial) public {
        _decimals = decmial;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}