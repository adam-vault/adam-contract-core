// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../interface/ICommonBudgetApproval.sol";

import "../lib/RevertMsg.sol";
import "../lib/Concat.sol";

contract BudgetApprovalExecutee {
    using Concat for string;

    mapping(address => bool) public budgetApprovals;

    event CreateBudgetApproval(address budgetApproval, bytes data);

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender], "BudgetApprovalExecutee: access denied");
        _;
    }

    function executeByBudgetApproval(address _to, bytes memory _data, uint256 _value) external onlyBudgetApproval returns (bytes memory) {
        (bool success, bytes memory result) = _to.call{ value: _value }(_data);
        if(!success) {
            revert(string("BudgetApprovalExecutee: execution failed - ").concat(RevertMsg.ToString(result)));
        }

        return result;
    }

    function _beforeCreateBudgetApproval(address) virtual internal {}

    /**
     * @notice create budget approvals
     * @param _budgetApprovals addresses of budget approval templates
     * @param data bytes of initialize data
     */
    function createBudgetApprovals(address[] memory _budgetApprovals, bytes[] memory data) public {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            _beforeCreateBudgetApproval(_budgetApprovals[i]);

            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);

            ICommonBudgetApproval(address(_budgetApproval)).afterInitialized();
        }
    }
}
