// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenB is ERC20("TokenB", "B") {
    constructor() {
        _mint(_msgSender(), 100000000);
    }
}