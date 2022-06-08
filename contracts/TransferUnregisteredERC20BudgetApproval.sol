// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "hardhat/console.sol";

contract TransferUnregisteredERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Transfer Unregistered ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address public token;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address _token,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) public initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for(uint i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }
        token = _token;
        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;
        emit AllowToken(token);
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        bytes memory data
    ) internal override {
        (address _token, address to, uint256 value) = abi.decode(data,(address, address, uint256));
        uint256 amount;
        bytes memory executeData = abi.encodeWithSelector(IERC20.transfer.selector, to, value);
        
        IBudgetApprovalExecutee(executee).executeByBudgetApproval(token, executeData, 0);
        amount = value;

        require(allowAllAddresses || addressesMapping[to], "invalid recipient");
        require(token == _token, "invalid token");
        require(allowAnyAmount || amount <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(amount), "invalid amount");

        if(!allowAnyAmount) {
            totalAmount -= amount;
        }
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount + IERC20(token).balanceOf(executee);
        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }

    function _addToAddress(address to) internal {
        require(!addressesMapping[to], "duplicate token");
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }
}