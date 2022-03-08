// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interface/IBudgetApproval.sol";
import "../interface/IDao.sol";

abstract contract CommonBudgetApproval is Initializable, UUPSUpgradeable, IBudgetApproval {

    address constant public ETH_ADDRESS = address(0x0);

    address public executor;
    address public dao;

    string public text;
    string public transactionType;

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;

    bool public allowAllTokens;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;

    bool public allowAnyAmount;
    uint256 public totalAmount;

    uint8 public amountPercentage;

    modifier onlyDao {
      require(msg.sender == dao, "access denied");
      _;
    }

    function initialize(
        address _dao, 
        address _executor, 
        string memory _text, 
        string memory _transactionType,
        bool _allowAllAddresses,
        address[] memory _addresses,
        bool _allowAllTokens,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
        ) public initializer {
        dao = _dao;
        executor = _executor;
        text = _text;
        transactionType = _transactionType;

        allowAllAddresses = _allowAllAddresses;
        for(uint i = 0; i < _addresses.length; i++) {
            addressesMapping[_addresses[i]] = true;
        }

        allowAllTokens = _allowAllTokens;
        tokens = _tokens;
        for(uint i = 0; i < _tokens.length; i++) {
            tokensMapping[_tokens[i]] = true;
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;
    }

    function checkAddressValid(address to) public view returns (bool) {
        return allowAllAddresses || addressesMapping[to];
    }

    function checkTokenValid(address token) public view returns (bool) {
        return allowAllTokens || tokensMapping[token];
    }

    function checkAmountValid(uint256 amount) public view returns (bool) {
        return amount < totalAmount;
    }

    function checkAmountPercentageValid(uint256 amount) public view returns (bool) {

        uint256 _totalAmount;

        if(allowAllTokens == true) {
            address[] memory mintedERC20 = IDao(dao).getMintedContracts();
            for(uint i = 0; i < mintedERC20.length; i++) {
                if(mintedERC20[i] == ETH_ADDRESS) {
                    _totalAmount += dao.balance;
                } else {
                    _totalAmount += IERC20(mintedERC20[i]).balanceOf(dao);
                }
                
            }
        } else {
            for(uint i = 0; i < tokens.length; i++) {
                if(tokens[i] == ETH_ADDRESS) {
                    _totalAmount += dao.balance;
                } else {
                    _totalAmount += IERC20(tokens[i]).balanceOf(dao);
                }
            }
        }

        if(_totalAmount == 0) {
            return false;
        }

        return (amount * 100 / _totalAmount) <= amountPercentage;
    }

    function _updateTotalAmount(uint256 usedAmount) internal {
        totalAmount -= usedAmount;
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function execute(address, bytes memory, uint256) public virtual;
}