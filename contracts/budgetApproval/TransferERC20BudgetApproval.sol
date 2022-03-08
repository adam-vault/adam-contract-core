// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./CommonBudgetApproval.sol";
import "../lib/BytesLib.sol";

import "../interface/IDao.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {

    using BytesLib for bytes;

    function execute(address to, bytes memory data, uint256 value) public override onlyDao {

        (bool isRequireToken, address requiredToken, uint256 requiredAmount) = getRequiredAmount(to, data, value);
        
        if(isRequireToken) {
            IDao(msg.sender).withdrawByBudgetApproval(requiredToken, requiredAmount);
        }

        (bool success,) = to.call{ value: value }(data);
        require(success == true, "execution failed");

        (address _token, address _recipient, uint256 _amount) = decode(to, data, value);
        require(checkValid(_token, _recipient, _amount) == true, "transaction not valid");

        _updateTotalAmount(_amount);
    }

    function checkValid(address _to, address _recipient, uint256 _amount) public view returns(bool valid) {
        return _checkAddressValid(_recipient) && 
               _checkTokenValid(_to) && 
               _checkAmountValid(_amount) && 
               _checkAmountPercentageValid(_amount);
    }

    function decode(address to, bytes memory data, uint256 value) public pure override returns (address, address, uint256) {

        if(data.length == 0) {
            return (to, to, value);
        }

        // transfer(address,uint256)
        if(data.toBytes4(0) != 0xa9059cbb) {
            revert("unexpected function call");
        }
    
        (address recipient, uint256 amount) = abi.decode(data.slice(4, data.length - 4),(address, uint256));
        return (to, recipient, amount);
    }

    function getRequiredAmount(address to, bytes memory data, uint256 value) public pure override returns(bool isRequireToken, address requiredToken, uint256 requiredAmount) {
        (address _to, address _recipient, uint256 _amount) = decode(to, data, value);

        if(_amount > 0) {
            isRequireToken = true;
            requiredAmount = _amount;
        }

        if(_to == _recipient) {
            requiredToken = ETH_ADDRESS;
        } else {
            requiredToken = _to;
        }
    }
}