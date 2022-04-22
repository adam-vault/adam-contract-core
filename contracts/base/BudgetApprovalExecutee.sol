// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract BudgetApprovalExecutee {
    mapping(address => bool) public budgetApprovals;

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender], "BudgetApprovalExecutee: access denied");
        _;
    }

    function executeByBudgetApproval(address _to, bytes memory _data, uint256 _value) external onlyBudgetApproval returns (bytes memory) {
        (bool success, bytes memory result) = _to.call{ value: _value }(_data);
        require(success, "execution failed");

        return result;
    }
}
