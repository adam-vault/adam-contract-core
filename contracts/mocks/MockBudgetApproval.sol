// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;
import "../base/CommonBudgetApproval.sol";

contract MockBudgetApproval is CommonBudgetApproval{
    function initialize(InitializeParams calldata params) public initializer {
        __BudgetApproval_init(params);
    }
    function afterInitialized() public override {

    }

    function _execute(uint256, bytes memory) internal override {

    }

    function executeParams() external pure override returns (string[] memory r) {
        return r;
    }

    function name() external pure override returns (string memory) {
        return "Mock";
    }
}

