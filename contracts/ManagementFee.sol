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
    address public adam;

    modifier isOwnerOrAdam() {
        require(msg.sender == owner || msg.sender == adam, "Caller is not owner or Adam Admin");
        _;
    }
    
    constructor(address _owner, address _strategy, address _adam) {
        owner = _owner;
        strategy = _strategy;
        adam = _adam;
    }

    function redemption(address to) external isOwnerOrAdam returns (bool) {
        return IStrategy(strategy).redempManagementFee(to);
    }
}