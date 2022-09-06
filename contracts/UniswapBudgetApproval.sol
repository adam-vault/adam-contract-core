// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "./lib/Constant.sol";

import "./base/PriceResolver.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IBudgetApprovalExecutee.sol";

contract UniswapBudgetApproval is CommonBudgetApproval, UniswapSwapper, PriceResolver {

    using BytesLib for bytes;

    event AllowToToken(address token);
    event ExecuteUniswapTransaction(uint256 id, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address toAddress);

    string public constant override name = "Uniswap Budget Approval";

    address[] public fromTokens;
    mapping(address => bool) public fromTokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;
    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;

    function initialize(
        InitializeParams calldata params,
        address[] memory _fromTokens,
        bool _allowAllToTokens,
        address[] calldata _toTokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage,
        address _baseCurrency
    ) public initializer {
        __BudgetApproval_init(params);
        
        for(uint i = 0; i < _fromTokens.length; i++) {
            _addFromToken(_fromTokens[i]);
        }

        allowAllToTokens = _allowAllToTokens;
        for(uint i = 0; i < _toTokens.length; i++) {
            _addToToken(_toTokens[i]);
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;

        __PriceResolver_init(_baseCurrency);

    }

    function afterInitialized() external override onlyExecutee {
        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", Constant.UNISWAP_ROUTER, type(uint256).max);
        for(uint i = 0; i < fromTokens.length; i++) {
            if(fromTokens[i] != Denominations.ETH) {
                IBudgetApprovalExecutee(executee()).executeByBudgetApproval(fromTokens[i], data, 0);
            }
        }
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address to";
        arr[1] = "bytes data";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        uint256 transactionId, 
        bytes memory data
    ) internal override {
        (address to, bytes memory executeData, uint256 value) = abi.decode(data,(address, bytes, uint256));
        require(to == Constant.UNISWAP_ROUTER || to == Constant.WETH_ADDRESS, "Invalid Uniswap address or WETH address");

        uint256 totalBalanceBeforeExecute = totalBalanceInBaseCurrency();

        bytes memory result = IBudgetApprovalExecutee(executee()).executeByBudgetApproval(to, executeData, value);

        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOut,
            bool estimatedIn,
            bool estimatedOut
        ) = decodeUniswapDataAfterSwap(to, executeData, value, result);

        uint256 amountInBaseCurrency = assetBaseCurrencyPrice(tokenIn, amountIn);

        require(!estimatedIn && !estimatedOut, "Unexpected swap result from Uniswap");

        require(fromTokensMapping[tokenIn], "Source token not whitelisted in budget");
        require(allowAllToTokens || toTokensMapping[tokenOut], "Target token not whitelisted in budget");
        require(allowAnyAmount || amountInBaseCurrency <= totalAmount, "Exceeded max budget transferable amount");
        require(checkAmountPercentageValid(totalBalanceBeforeExecute, amountInBaseCurrency), "Exceeded max budget transferable percentage");


        if(!allowAnyAmount) {
            totalAmount -= amountInBaseCurrency;
        }

        emit ExecuteUniswapTransaction(transactionId, tokenIn, tokenOut, amountIn, amountOut, Constant.UNISWAP_ROUTER);
    }

    function totalBalanceInBaseCurrency() internal view returns (uint256 totalBalance) {
        for (uint i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == Denominations.ETH) {
                totalBalance += assetBaseCurrencyPrice(Denominations.ETH, executee().balance);
            } else {
                totalBalance += assetBaseCurrencyPrice(fromTokens[i], IERC20(fromTokens[i]).balanceOf(executee()));
            }
        }
    }

    function checkAmountPercentageValid(uint256 totalBalance, uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        if (totalBalance == 0) return false;

        return amount <= totalBalance * amountPercentage / 100;
    }

    function _addFromToken(address token) internal {
        require(!fromTokensMapping[token], "Duplicated token in source token list");
        require(canResolvePrice(token), "Unresolvable token in source token list");
        fromTokens.push(token);
        fromTokensMapping[token] = true;
        emit AllowToken(token);
    }

    function _addToToken(address token) internal {
        require(!toTokensMapping[token], "Duplicated token in target token list");
        toTokensMapping[token] = true;
        emit AllowToToken(token);
    }

}