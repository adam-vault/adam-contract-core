// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../interface/ICommonBudgetApproval.sol";
import "../base/BudgetApprovalExecutee.sol";

import "../lib/RevertMsg.sol";
import "../lib/Concat.sol";

contract MockBudgetApprovalExecutee is BudgetApprovalExecutee {
    address private _team;
    address private _accountingSystem;

    function team() public view override returns(address) {
        return _team;
    }
    function accountingSystem() public view override returns(address) {
        return _accountingSystem;
    }
    receive() external payable {

    }
}
