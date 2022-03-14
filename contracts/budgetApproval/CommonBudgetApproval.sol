// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "../interface/IBudgetApproval.sol";
import "../interface/IDao.sol";
import "../interface/IMembership.sol";

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

    function checkAmountPercentageValid(uint256 amount, bool executed) public view returns (bool) {

        uint256 _totalAmount;
        address[] memory ownedTokens;

        if(executed) {
            _totalAmount += amount;
        }

        if(allowAllTokens == true) {
            ownedTokens =  IDao(dao).getMintedContracts();
        } else {
            ownedTokens = tokens;
        }

        for(uint i = 0; i < ownedTokens.length; i++) {
            if(ownedTokens[i] == ETH_ADDRESS) {
                _totalAmount += dao.balance;
            } else {
                _totalAmount += IERC20(ownedTokens[i]).balanceOf(dao);
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

    function _getBurnAmountsOfAllMembers(address _token, uint256 _totalAmount) public view returns (address[] memory, uint256[] memory) {
        address _membership = IDao(dao).membership();
        address[] memory members = IMembership(_membership).getAllMembers();
        uint256[] memory amounts = new uint[](members.length);
        
        uint256 totalBalance;
        for(uint i = 0; i < members.length; i++) {
            totalBalance += IERC1155(dao).balanceOf(members[i], IDao(dao).getTokenId(_token));
        }

        uint256 amountLeft = _totalAmount;
        for(uint i = 0; i < members.length - 1; i++) {
            uint256 memberBalance = IERC1155(dao).balanceOf(members[i], IDao(dao).getTokenId(_token));
            amounts[i] = _totalAmount * memberBalance / totalBalance;
            amountLeft -= _totalAmount * memberBalance / totalBalance;
        }

        amounts[members.length - 1] = amountLeft;

        return (members, amounts);
    }

    function _authorizeUpgrade(address) internal override initializer {}

    function execute(address, bytes memory, uint256) public virtual;
}