// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./CommonBudgetApproval.sol";
import "../lib/BytesLib.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {

    using BytesLib for bytes;

    function execute(address to, bytes memory data, uint256 value) public override returns (bool haveTokenUsed, address tokenUsed,uint256 usedAmount, bool haveTokenGot, address tokenGot, uint256 gotAmount) {
        (bool success,) = to.call{ value: value }(data);
        require(success == true, "execution failed");

        (address _token, address _recipient, uint256 _amount) = decode(to, data, value);
        require(checkValid(_token, _recipient, _amount) == true, "transaction not valid");

        _updateAllowedTotalAmount(_amount);
        haveTokenUsed = true;
        tokenUsed = _token;
        usedAmount = _amount;
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

    function getRequiredAmount(address to, bytes memory data, uint256 value) external pure override returns (bool haveTokenUsed, address tokenUsed, uint256 usedAmount) {
        (address _to, address _recipient, uint256 _amount) = decode(to, data, value);

        if(_amount > 0) {
            haveTokenUsed = true;
            usedAmount = _amount;
        }

        if(_to == _recipient) {
            tokenUsed = ETH_ADDRESS;
        } else {
            tokenUsed = _to;
        }
    }
}