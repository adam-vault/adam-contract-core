// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TokenD1155 is ERC1155 {
    uint256 total = 100000;
    constructor() ERC1155("") {
        
    }

    function mint(address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        _mint( to, id, amount, data);
    }
}