// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";

import "./interface/IDao.sol";
import "hardhat/console.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {

    using BytesLib for bytes;

    string public constant override NAME = "Transfer ERC20 Budget Approval";

    function execute(address[] memory to, bytes[] memory data, uint256[] memory value) public {
        require(data.length == to.length, "invalid input");
        require(data.length == value.length, "invalid input");

        for(uint i = 0; i < data.length; i++) {
            execute(to[i], data[i], value[i]);
        }
    }

    // transfer ETH by sending data.length == 0
    // transfer ERC20 by using transfer(address,uint256)
    function execute(address to, bytes memory data, uint256 value) public override onlySelf {
        (bool isRequireToken, address requiredToken, uint256 requiredAmount) = getRequiredAmount(to, data, value);
        console.log("====1==");
        if(isRequireToken) {
            console.log("===2===");
            (address[] memory members, uint256[] memory amounts) = _getAmountsOfAllMembersOnProRata(requiredToken, requiredAmount);
            console.log("==3====");
            uint256 totalAmount = IDao(payable(dao)).withdrawByBudgetApproval(requiredToken, members, amounts, false);
            console.log("==4====");
            require(totalAmount == requiredAmount, "invalid");
        }
        console.log("===5===");
        console.logBytes(data);
        console.logUint(IERC20(requiredToken).balanceOf(address(this)));
        (bool success,) = to.call{ value: value }(data);
        require(success, "execution failed");
        console.log("===6===");
        (address _token, address _recipient, uint256 _amount) = decode(to, data, value);
        require(checkValid(_token, _recipient, _amount, true), "transaction not allowed");
        console.log("===7===");
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

    function encodeTransactionData(address[] calldata _to, bytes[] calldata _data, uint256[] calldata _amount) public pure returns (bytes memory) {
        return abi.encodeWithSignature("execute(address[],bytes[],uint256[])", _to, _data, _amount);
    }

    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        // execute(address,bytes,uint256)
        if(interfaceID == 0xa04a0908) {
            return true;
        }

        // execute(address[],bytes[],uint256[])
        if(interfaceID == 0x947fe812) {
            return true;
        }

        return false;
    }
}