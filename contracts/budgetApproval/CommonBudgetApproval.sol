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
    mapping(address => bool) public allowedAddressesMapping;

    bool public allowAllTokens;
    address[] public allowedTokens;
    mapping(address => bool) public allowedTokensMapping;

    bool public allowAnyAmount;
    uint256 public totalAllowedAmount;

    uint8 public allowedAmountPercentage;

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
        address[] memory _allowedAddresses,
        bool _allowAllTokens,
        address[] memory _allowedTokens,
        bool _allowAnyAmount,
        uint256 _totalAllowedAmount,
        uint8 _allowedAmountPercentage
        ) public initializer {
        dao = _dao;
        executor = _executor;
        text = _text;
        transactionType = _transactionType;

        allowAllAddresses = _allowAllAddresses;
        for(uint i = 0; i < _allowedAddresses.length; i++) {
            allowedAddressesMapping[_allowedAddresses[i]] = true;
        }

        allowAllTokens = _allowAllTokens;
        allowedTokens = _allowedTokens;
        for(uint i = 0; i < _allowedTokens.length; i++) {
            allowedTokensMapping[_allowedTokens[i]] = true;
        }

        allowAnyAmount = _allowAnyAmount;
        totalAllowedAmount = _totalAllowedAmount;
        allowedAmountPercentage = _allowedAmountPercentage;
    }

    function _checkAddressValid(address to) public view returns (bool) {
        return allowAllAddresses || allowedAddressesMapping[to];
    }

    function _checkTokenValid(address token) public view returns (bool) {
        return allowAllTokens || allowedTokensMapping[token];
    }

    function _checkAmountValid(uint256 amount) public view returns (bool) {
        return amount < totalAllowedAmount;
    }

    function _checkAmountPercentageValid(uint256 amount) public view returns (bool) {

        uint256 totalAmount;

        if(allowAllTokens == true) {
            address[] memory mintedERC20 = IDao(dao).getMintedContracts();
            for(uint i = 0; i < mintedERC20.length; i++) {
                if(mintedERC20[i] == ETH_ADDRESS) {
                    totalAmount += dao.balance;
                } else {
                    totalAmount += IERC20(mintedERC20[i]).balanceOf(dao);
                }
                
            }
        } else {
            for(uint i = 0; i < allowedTokens.length; i++) {
                if(allowedTokens[i] == ETH_ADDRESS) {
                    totalAmount += dao.balance;
                } else {
                    totalAmount += IERC20(allowedTokens[i]).balanceOf(dao);
                }
            }
        }

        if(totalAmount == 0) {
            return false;
        }

        return (amount * 100 / totalAmount) <= allowedAmountPercentage;
    }

    function _updateAllowedTotalAmount(uint256 usedAmount) internal {
        totalAllowedAmount -= usedAmount;
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function decode(address, bytes memory, uint256) public pure virtual returns (address, address, uint256);
    function execute(address, bytes memory, uint256) public virtual returns (bool, address, uint256, bool, address, uint256);
}