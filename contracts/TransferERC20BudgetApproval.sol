// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";

import "./interface/IDao.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {

    using BytesLib for bytes;

    string public constant NAME = "Transfer ERC20 Budget Approval";

    // transfer ETH by sending data.length == 0
    // transfer ERC20 by using transfer(address,uint256)
    function execute(address to, bytes memory data, uint256 value) public override onlySelf {

        (bool isRequireToken, address requiredToken, uint256 requiredAmount) = getRequiredAmount(to, data, value);
    
        if(isRequireToken) {
            (address[] memory members, uint256[] memory amounts) = _getAmountsOfAllMembersOnProRata(requiredToken, requiredAmount);
            uint256 totalAmount = IDao(dao).withdrawByBudgetApproval(requiredToken, members, amounts, false);
            require(totalAmount == requiredAmount, "invalid");
        }

        (bool success,) = to.call{ value: value }(data);
        require(success == true, "execution failed");

        (address _token, address _recipient, uint256 _amount) = decode(to, data, value);
        require(checkValid(_token, _recipient, _amount, true) == true, "transaction not valid");
        _updateTotalAmount(_amount);
    }

    function checkValid(address _token, address _recipient, uint256 _amount, bool executed) public view returns(bool valid) {
        return checkAddressValid(_recipient) && 
               checkTokenValid(_token) && 
               checkAmountValid(_amount) && 
               checkAmountPercentageValid(_amount, executed);
    }

    // return (address token, address recipient, uint256 amount)
    function decode(address to, bytes memory data, uint256 value) public pure returns (address, address, uint256) {

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

    function getRequiredAmount(address to, bytes memory data, uint256 value) public pure returns(bool isRequireToken, address requiredToken, uint256 requiredAmount) {
        (address _to,, uint256 _amount) = decode(to, data, value);

        if(_amount > 0) {
            isRequireToken = true;
            requiredToken = _to;
            requiredAmount = _amount;
        }
    }
}