// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TokenC721 is ERC721 {
    uint256 total = 100000;
    constructor() ERC721("TokenC721", "C721") {}

    function mint(address account, uint256 id) public {
        _mint(account, id);
    }

}