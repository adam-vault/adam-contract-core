// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./base/PriceResolver.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "hardhat/console.sol";

contract TransferLiquidERC20BudgetApproval is CommonBudgetApproval, PriceResolver {
    using BytesLib for bytes;

    string public constant override name = "Transfer Liquid ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) public initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for(uint i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }
        for(uint i = 0; i < _tokens.length; i++) {
            _addToken(_tokens[i]);
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;
        __PriceResolver_init(Denominations.ETH);
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        bytes memory data
    ) internal override {
        (address token, address to, uint256 value) = abi.decode(data,(address, address, uint256));
        uint256 amountInBaseCurrency;

        if (token == ETH_ADDRESS) {
            IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, "", value);
        } else {
            bytes memory executeData = abi.encodeWithSelector(IERC20.transfer.selector, to, value);
            IBudgetApprovalExecutee(executee).executeByBudgetApproval(token, executeData, 0);
        }
        
        amountInBaseCurrency = assetBaseCurrencyPrice(token, value);
        require(allowAllAddresses || addressesMapping[to], "Recipient not whitelisted in budget");
        require(tokensMapping[token], "Token not whitelisted in budget");
        require(allowAnyAmount || amountInBaseCurrency <= totalAmount, "Exceeded max budget transferable amount");
        require(checkAmountPercentageValid(amountInBaseCurrency), "Exceeded max budget transferable percentage");

        if(!allowAnyAmount) {
            totalAmount -= amountInBaseCurrency;
        }
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount;

        for (uint i = 0; i < tokens.length; i++) {
            if (tokens[i] == Denominations.ETH) {
                _totalAmount += assetBaseCurrencyPrice(Denominations.ETH, executee.balance);
            }else {
                _totalAmount += assetBaseCurrencyPrice(tokens[i], IERC20(tokens[i]).balanceOf(executee));
            }
        }

        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }

    function _addToken(address token) internal {
        require(!tokensMapping[token], "Duplicated Item in source token list.");
        require(canResolvePrice(token), "Unresolvable token in target token list.");

        tokens.push(token);
        tokensMapping[token] = true;
        emit AllowToken(token);
    }

    function _addToAddress(address to) internal {
        require(!addressesMapping[to], "Duplicated address in target address list");
        addressesMapping[to] = true;
        emit AllowAddress(to);

    }


}