// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenA is ERC20("TokenA", "A") {
    function receiveToken(ERC20 token, address from) public payable returns (bool){
        token.transferFrom(from, address(this), 100);
        return true;
    }

    function mint(address to, uint amount) public {
        _mint(to, amount);
    }
}