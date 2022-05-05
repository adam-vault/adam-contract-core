// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override NAME = "Transfer ERC20 Budget Approval";

    function initialize(InitializeParams calldata params) public initializer {
        __BudgetApproval_init(params);
    }

    function checkValid(
        address _token,
        address _recipient,
        uint256 _amount,
        bool executed
    )
        public
        view
        returns(bool valid)
    {
        return checkAddressValid(_recipient) && 
               checkTokenValid(_token) && 
               checkAmountValid(_amount) && 
               checkAmountPercentageValid(_amount, executed) &&
               checkUsageCountValid();
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

        require(checkValid(_token, _recipient, _amount, true), "transaction not allowed");
        _updateTotalAmount(_amount);
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

    function encodeInitializeData(InitializeParams calldata params) public pure returns (bytes memory data) {
        return abi.encodeWithSelector(
            this.initialize.selector,
            params
        );
    }

    function decodeInitializeData(bytes memory _data) public pure returns (InitializeParams memory result) {

        if(_data.toBytes4(0) != this.initialize.selector) {
            revert("unexpected function");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (InitializeParams));
    }

    function encodeMultipleTransactionData(
        address[] calldata _to,
        bytes[] calldata _data,
        uint256[] calldata _amount
    ) public pure returns (bytes memory) {
        return abi.encodeWithSelector(this.executeMultiple.selector, _to, _data, _amount);
    }
}