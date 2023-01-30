// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;
import "../base/PriceResolver.sol";

contract MockPriceResolver is PriceResolver{
    
    address public _baseCurrency;
    address public _accountSystem;

    function baseCurrency() public view virtual override returns (address){        
        return _baseCurrency;
    }

    function accountSystem() public view virtual override returns (address){        
        return _accountSystem;
    }
    function setBaseCurrency(address __baseCurrency) public virtual returns (address){
        _baseCurrency = __baseCurrency;
    }  

    function setAccountSystem(address __accountSystem) public virtual returns (address){
         _accountSystem = __accountSystem;
    }
}

