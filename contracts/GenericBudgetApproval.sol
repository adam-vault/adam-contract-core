// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract GenericBudgetApproval is CommonBudgetApproval {

    string public constant override name = "Generic Budget Approval";
    
    function initialize(InitializeParams calldata params) public initializer {
        __BudgetApproval_init(params);
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address to";
        arr[1] = "bytes data";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(bytes memory data) internal override {
        (address to, bytes memory executeData, uint256 value) = abi.decode(data,(address, bytes, uint256));

        IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, executeData, value);
    }
}