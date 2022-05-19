// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

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

    string public constant override name = "Uniswap Budget Approval";

    bool public allowAllAddresses;
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
        uint8 _amountPercentage
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
    }

    function afterInitialized() external override onlyExecutee {
        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", Constant.UNISWAP_ROUTER, type(uint256).max);
        for(uint i = 0; i < fromTokens.length; i++) {
            if(fromTokens[i] != ETH_ADDRESS) {
                IBudgetApprovalExecutee(executee).executeByBudgetApproval(fromTokens[i], data, 0);
            }
        }
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address to";
        arr[1] = "bytes data";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        bytes memory data
    ) internal override {
        (address to, bytes memory executeData, uint256 value) = abi.decode(data,(address, bytes, uint256));
        require(to == Constant.UNISWAP_ROUTER, "address not uniswap router");

        bytes memory result = IBudgetApprovalExecutee(executee).executeByBudgetApproval(to, executeData, value);

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

        require(fromTokensMapping[tokenIn], "invalid token");
        require(allowAllToTokens || toTokensMapping[tokenOut], "invalid to token");
        require(allowAnyAmount || ethAmountIn <= totalAmount, "invalid amount");
        require(checkAmountPercentageValid(ethAmountIn), "invalid amount");


        if(!allowAnyAmount) {
            totalAmount -= ethAmountIn;
        }
    }

    function checkAmountPercentageValid(uint256 amount) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount;

        for (uint i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == ETH_ADDRESS) {
                _totalAmount += executee.balance;
            } else {
                _totalAmount += assetEthPrice(fromTokens[i], IERC20(fromTokens[i]).balanceOf(executee));
            }
        }

        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }

    function _addFromToken(address token) internal {
        require(!fromTokensMapping[token], "duplicate from token");
        require(canResolvePrice(token), "token price cannot be resolve");
        fromTokens.push(token);
        fromTokensMapping[token] = true;
        emit AllowToken(token);
    }

    function _addToToken(address token) internal {
        require(!toTokensMapping[token], "duplicate to token");
        toTokensMapping[token] = true;
        emit AllowToToken(token);
    }

}