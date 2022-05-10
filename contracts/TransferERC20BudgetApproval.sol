// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override NAME = "Transfer ERC20 Budget Approval";

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

    function executeMultiple(
        address[] memory to,
        bytes[] memory data,
        uint256[] memory value
    ) public {
        require(data.length == to.length, "invalid input");
        require(data.length == value.length, "invalid input");

        for(uint i = 0; i < data.length; i++) {
            execute(to[i], data[i], value[i]);
        }
    }

    // transfer ETH by sending data.length == 0
    // transfer ERC20 by using transfer(address,uint256)
    function execute(
        address to,
        bytes memory data,
        uint256 value
    ) public override onlySelf {
        IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, data, value);
        (address _token, address _recipient, uint256 _amount) = decode(to, data, value);

        require(allowAllAddresses || addressesMapping[_recipient], "invalid recipient");
        require(tokensMapping[_token], "invalid token");
        require(allowAnyAmount || _amount <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(_amount), "invalid amount");
        require(checkUsageCountValid(), "usage exceeded");


        if(!allowAnyAmount) {
            totalAmount -= _amount;
        }
        _updateUsageCount();
    }

    // return (address token, address recipient, uint256 amount)
    function decode(
        address to,
        bytes memory data,
        uint256 value
    )
        public
        pure
        returns (address, address, uint256)
    {

        // transfer ETH
        if(data.length == 0) {
            return (ETH_ADDRESS, to, value);
        }

        // transfer(address,uint256)
        if(data.toBytes4(0) != 0xa9059cbb) {
            revert("unexpected function call");
        }
    
        (address recipient, uint256 amount) = abi.decode(data.slice(4, data.length - 4),(address, uint256));
        return (to, recipient, amount);
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

        return (amount * 100 / _totalAmount) <= amountPercentage;
    }


}