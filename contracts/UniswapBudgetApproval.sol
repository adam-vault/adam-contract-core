// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";

import "./base/PriceResolver.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IBudgetApprovalExecutee.sol";

contract UniswapBudgetApproval is CommonBudgetApproval, UniswapSwapper, PriceResolver {

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
        __PriceResolver_init(IAdam(IDao(dao).adam()).feedRegistry());
    }

    function afterInitialized() external override onlyExecutee {
        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", UNISWAP_ROUTER, type(uint256).max);
        for(uint i = 0; i < tokens.length; i++) {
            if(tokens[i] != ETH_ADDRESS) {
                IBudgetApprovalExecutee(executee).executeByBudgetApproval(tokens[i], data, 0);
            }
        }
    }


    function execute(address to, bytes memory data, uint256 value) public override onlySelf {
        bytes memory result = IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, data, value);

        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            ,
            bool estimatedIn,
            bool estimatedOut
        ) = UniswapSwapper.decodeUniswapDataAfterSwap(to, data, value, result);

        uint256 ethAmountIn = assetEthPrice(tokenIn, amountIn);

        require(!estimatedIn && !estimatedOut, "unexpected result");

        require(tokensMapping[tokenIn], "invalid token");
        require(allowAllToTokens || toTokensMapping[tokenOut], "invalid to token");
        require(allowAnyAmount || ethAmountIn <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(ethAmountIn), "invalid amount");
        require(checkUsageCountValid(), "usage exceeded");

        if(!allowAnyAmount) {
            totalAmount -= ethAmountIn;
        }

        _updateUsageCount();
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount;

        for (uint i = 0; i < tokens.length; i++) {
            if (tokens[i] == ETH_ADDRESS) {
                _totalAmount += executee.balance;
            } else {
                _totalAmount += assetEthPrice(tokens[i], IERC20(tokens[i]).balanceOf(executee));
            }
        }

        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }

}