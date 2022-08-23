// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../interface/ICommonBudgetApproval.sol";

import "../lib/RevertMsg.sol";
import "../lib/Concat.sol";

contract BudgetApprovalExecutee {
    using Concat for string;

    address public team;

    mapping(address => bool) public budgetApprovals;

    event CreateBudgetApproval(address budgetApproval, bytes data);
    event RevokeBudgetApproval(address budgetApproval);

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender], "BudgetApprovalExecutee: access denied");
        _;
    }

    function executeByBudgetApproval(address _to, bytes memory _data, uint256 _value) external onlyBudgetApproval returns (bytes memory) {
        (bool success, bytes memory result) = _to.call{ value: _value }(_data);
        if(!success) {
            revert(string("Reverted by external contract").concat(RevertMsg.ToString(result)));
        }

        return result;
    }

    function _beforeCreateBudgetApproval(address) virtual internal {}

    function createBudgetApprovals(address[] memory _budgetApprovals, bytes[] memory data) public {
        require(_budgetApprovals.length == data.length, "Incorrect Calldata");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            _beforeCreateBudgetApproval(_budgetApprovals[i]);

            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);

            ICommonBudgetApproval(address(_budgetApproval)).afterInitialized();
        }
    }

    function _beforeRevokeBudgetApproval(address) virtual internal {}

    function revokeBudgetApprovals(address[] memory _budgetApprovals) public {
        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(budgetApprovals[_budgetApprovals[i]], "BudgetApprovalExecutee: budget approval is not valid");
            _beforeRevokeBudgetApproval(_budgetApprovals[i]);

            budgetApprovals[_budgetApprovals[i]] = false;
            emit RevokeBudgetApproval(_budgetApprovals[i]);
        }
    }
}
