// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../interface/ICommonBudgetApproval.sol";
import "../lib/RevertMsg.sol";
import "../lib/Concat.sol";

abstract contract BudgetApprovalExecutee {
    using Concat for string;

    mapping(address => bool) private _budgetApprovals;

    event CreateBudgetApproval(address budgetApproval, bytes data);
    event ExecuteByBudgetApproval(address budgetApproval, bytes data);
    event RevokeBudgetApproval(address budgetApproval);

    error OnlyBudgetApproval();
    error InputLengthNotMatch(uint count1, uint count2);
    error BudgetApprovalNotExists(address budgetApproval);

    modifier onlyBudgetApproval {
        if (!budgetApprovals(msg.sender)) {
            revert OnlyBudgetApproval();
        }
        _;
    }

    function team() public view virtual returns (address);
    
    function budgetApprovals(address template) public view virtual returns (bool) {
        return _budgetApprovals[template];
    }

    function executeByBudgetApproval(address _to, bytes memory _data, uint256 _value) external onlyBudgetApproval returns (bytes memory) {
        (bool success, bytes memory result) = _to.call{ value: _value }(_data);
        if(!success) {
            revert(string("Reverted by external contract - ").concat(RevertMsg.ToString(result)));
        }
        emit ExecuteByBudgetApproval(msg.sender, _data);

        return result;
    }

    function _beforeCreateBudgetApproval(address) virtual internal {}

    function createBudgetApprovals(address[] memory __budgetApprovals, bytes[] memory data) external virtual {
        if (__budgetApprovals.length != data.length) {
            revert InputLengthNotMatch(__budgetApprovals.length, data.length);
        }

        for(uint i = 0; i < __budgetApprovals.length; i++) {
            _beforeCreateBudgetApproval(__budgetApprovals[i]);

            ERC1967Proxy ba = new ERC1967Proxy(__budgetApprovals[i], data[i]);
            _budgetApprovals[address(ba)] = true;
            emit CreateBudgetApproval(address(ba), data[i]);

            ICommonBudgetApproval(address(ba)).afterInitialized();
        }
    }

    function _beforeRevokeBudgetApproval(address) virtual internal {}

    function revokeBudgetApprovals(address[] memory __budgetApprovals) public {
        for(uint i = 0; i < __budgetApprovals.length; i++) {
            address ba = __budgetApprovals[i];
            if (!_budgetApprovals[ba]) {
                revert BudgetApprovalNotExists(ba);
            }
            _beforeRevokeBudgetApproval(ba);

            _budgetApprovals[ba] = false;
            emit RevokeBudgetApproval(ba);
        }
    }

    uint256[50] private __gap;
}
