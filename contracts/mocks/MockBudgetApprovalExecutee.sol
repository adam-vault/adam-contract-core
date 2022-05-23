// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockBudgetApprovalExecutee {
    mapping(address => bool) public budgetApprovals;

    event CreateBudgetApproval(address budgetApproval, bytes data);

    function executeByBudgetApproval(address _to, bytes memory _data, uint256 _value) external returns (bytes memory) {
        (bool success, bytes memory result) = _to.call{ value: _value }(_data);
        require(success, "execution failed");

        return result;
    }

    function _beforeCreateBudgetApproval(address) internal {}

    function createBudgetApprovals(address[] memory _budgetApprovals, bytes[] memory data) public {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            _beforeCreateBudgetApproval(_budgetApprovals[i]);

            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }

    receive() external payable {

    }
}
