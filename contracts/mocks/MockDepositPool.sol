// SPDX-License-Identifier: GPL-3.0
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

pragma solidity 0.8.7;

contract MockDepositPool is ERC1155 {
    bool public canCreateBudgetApproval;
    mapping(address => uint256) public idOf;

    constructor() ERC1155("") {}

    function setId(address token, uint256 tokenId) public {
        idOf[token] = tokenId;
    }

    function mint(address addr, uint256 tokenId, uint256 amount) public {
        return _mint(addr, tokenId, amount, "");
    }

    function deposit() public payable {

    }
    function withdraw(address, uint256) public {

    }
    function depositToken(address token, uint256 amount) public {

    }
}
