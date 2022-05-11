// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";

import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IBudgetApprovalExecutee.sol";

contract UniswapBudgetApproval is CommonBudgetApproval, UniswapSwapper {

    using BytesLib for bytes;

    event AllowToToken(address token);

    string public constant override NAME = "Uniswap Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;
    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllToTokens,
        address[] calldata _toTokens
    ) public initializer {
        __BudgetApproval_init(params);
        
        allowAllAddresses = params.allowAllAddresses;
        for(uint i = 0; i < params.addresses.length; i++) {
            addressesMapping[params.addresses[i]] = true;
            emit AllowAddress(params.addresses[i]);
        }

        tokens = params.tokens;
        for(uint i = 0; i < params.tokens.length; i++) {
            tokensMapping[params.tokens[i]] = true;
            emit AllowToken(params.tokens[i]);
        }

        allowAnyAmount = params.allowAnyAmount;
        totalAmount = params.totalAmount;
        emit AllowAmount(totalAmount);
        amountPercentage = params.amountPercentage;


        allowAllToTokens = _allowAllToTokens;
        for(uint i = 0; i < _toTokens.length; i++) {
            toTokensMapping[_toTokens[i]] = true;
            emit AllowToToken(_toTokens[i]);
        }

        UniswapSwapper.setParams(IAdam(IDao(dao).adam()).constantState());
    }


    function execute(address to, bytes memory data, uint256 value) public override onlySelf {
        bytes memory result = IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, data, value);

        // approve(address,uint256) for ERC20
        if(data.toBytes4(0) == 0x095ea7b3) {
            return;
        }

        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            ,
            bool estimatedIn,
            bool estimatedOut
        ) = UniswapSwapper.decodeUniswapDataAfterSwap(to, data, value, result);
        require(!estimatedIn && !estimatedOut, "unexpected result");

        require(tokensMapping[tokenIn], "invalid token");
        require(allowAllToTokens || toTokensMapping[tokenOut], "invalid to token");
        require(allowAnyAmount || amountIn <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(amountIn), "invalid amount");
        require(checkUsageCountValid(), "usage exceeded");

        if(!allowAnyAmount) {
            totalAmount -= amountIn;
        }

        _updateUsageCount();
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount;

        for (uint i = 0; i < tokens.length; i++) {
            if(tokens[i] == ETH_ADDRESS) {
                _totalAmount += executee.balance;
            } else {
                _totalAmount += IERC20(tokens[i]).balanceOf(executee);
            }
        }

        if (_totalAmount == 0) return false;

        return (amount * 100 / _totalAmount) <= amountPercentage;
    }

}