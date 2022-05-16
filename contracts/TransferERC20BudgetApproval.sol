// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "hardhat/console.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Transfer ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;

    function initialize(InitializeParams calldata params) public initializer {
        __BudgetApproval_init(params);
        allowAllAddresses = params.allowAllAddresses;
        for(uint i = 0; i < params.addresses.length; i++) {
            addressesMapping[params.addresses[i]] = true;
            emit AllowAddress(params.addresses[i]);
        }

        tokens = params.tokens;
        for(uint i = 0; i < params.tokens.length; i++) {
            tokensMapping[params.tokens[i]] = true;
            emit AllowToken(params.tokens[i]);
        }

        allowAnyAmount = params.allowAnyAmount;
        totalAmount = params.totalAmount;
        emit AllowAmount(totalAmount);
        amountPercentage = params.amountPercentage;
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
        (address token, address to, uint256 value) = abi.decode(data,(address, address, uint256));

        if (token == ETH_ADDRESS) {
            IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, "", value);
        } else {
            bytes memory executeData = abi.encodeWithSelector(IERC20.transfer.selector, to, value);
            IBudgetApprovalExecutee(executee).executeByBudgetApproval(token, executeData, 0);
        }

        require(allowAllAddresses || addressesMapping[to], "invalid recipient");
        require(tokensMapping[token], "invalid token");
        require(allowAnyAmount || value <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(value), "invalid amount");

        if(!allowAnyAmount) {
            totalAmount -= value;
        }
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount;

        for (uint i = 0; i < tokens.length; i++) {
            if(tokens[i] == ETH_ADDRESS) {
                _totalAmount += executee.balance;
            } else {
                _totalAmount += IERC20(tokens[i]).balanceOf(executee);
            }
        }

        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }


}