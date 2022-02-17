// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./interface/IStrategy.sol";
import "./interface/IManagementFee.sol";

/**
 * @title Owner
 * @dev Set & change owner
 */


contract ManagementFee is ERC1155Holder, IManagementFee {
    address public owner;
    address public strategy;
    address public adam;
    address public beneficiary;

    modifier isOwnerOrAdam() {
        require(msg.sender == owner || msg.sender == adam, "Caller is not owner or Adam Admin");
        _;
    }
    
    constructor(address _owner, address _strategy, address _adam) {
        owner = _owner;
        strategy = _strategy;
        adam = _adam;
    }

    function setBeneficiary(address _beneficiary) external override isOwnerOrAdam {
        beneficiary = _beneficiary;
    }

    function redemption() external override isOwnerOrAdam returns (bool) {
        require(beneficiary != address(0x0), "No beneficiary account" );
        return IStrategy(strategy).redeemManagementFee(beneficiary);
    }
}