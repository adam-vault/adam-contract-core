// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./interface/IStrategy.sol";

/**
 * @title Owner
 * @dev Set & change owner
 */


contract ManagementFee is ERC1155Holder {
    address public owner;
    address public strategy;

    modifier isOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }
    
    constructor(address _owner, address _strategy){
        owner = _owner;
        strategy = _strategy;
    }

    function redemption(address to) external isOwner returns (bool){
        return IStrategy(strategy).redempManagementFee(to);
    }
}