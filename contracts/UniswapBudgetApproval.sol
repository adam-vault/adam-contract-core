// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "./lib/Constant.sol";

import "./base/PriceResolver.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IBudgetApprovalExecutee.sol";

contract UniswapBudgetApproval is CommonBudgetApproval, UniswapSwapper {

    using BytesLib for bytes;

    event AllowToToken(address token);
    event ExecuteUniswapInTransaction(uint256 indexed id, address indexed executor, address indexed toAddress, address token, uint256 amount);
    event ExecuteUniswapOutTransaction(uint256 indexed id, address indexed executor, address indexed toAddress, address token, uint256 amount);
    event ExecuteWETH9Transaction(uint256 indexed id, address indexed executor, address indexed toAddress, address tokenIn, address tokenOut, uint256 amount);

    string public constant override name = "Uniswap Budget Approval";

    bool public allowAllFromTokens;
    address public fromToken;
    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;

    mapping(uint256 => mapping(address => uint256)) private _tokenInAmountOfTransaction;
    mapping(uint256 => address[]) private _tokenInOfTransaction;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllFromTokens,
        address _fromToken,
        bool _allowAllToTokens,
        address[] calldata _toTokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) public initializer {
        __BudgetApproval_init(params);
        
        allowAllFromTokens = _allowAllFromTokens;
        if(!_allowAllFromTokens) {
            approveTokenForUniswap(_fromToken);
            emit AllowToken(_fromToken);
        }

        allowAllToTokens = _allowAllToTokens;
        for(uint i = 0; i < _toTokens.length; i++) {
            _addToToken(_toTokens[i]);
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;

    }

    function approveTokenForUniswap(address _fromToken) public {

        address _executee = executee();

        require(msg.sender == _executee ||
          msg.sender == executor() ||
          ITeam(team()).balanceOf(msg.sender, executorTeamId()) > 0, "Executor not whitelisted in budget"
        );

        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", Constant.UNISWAP_ROUTER, type(uint256).max);
        IBudgetApprovalExecutee(_executee).executeByBudgetApproval(_fromToken, data, 0);
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
        
        if (to == Constant.UNISWAP_ROUTER) {
            _executeUniswapCall(transactionId, to, executeData, value);
        } else if (to == WETH9()) {
            _executeWETH9Call(transactionId, to, executeData, value);
        } else {
            revert("Invalid target address");
        }
    }

    function _executeUniswapCall(uint256 transactionId, address to, bytes memory executeData, uint256 value) private {
        address __executee = executee();

        bytes memory response = IBudgetApprovalExecutee(__executee).executeByBudgetApproval(to, executeData, value);
        MulticallData[] memory mDataArr = this.decodeUniswapMulticall(executeData, value, response);

        address[] storage _tokenIn = _tokenInOfTransaction[transactionId];
        mapping(address => uint256) storage _tokenInAmount = _tokenInAmountOfTransaction[transactionId];

        for (uint i = 0; i < mDataArr.length; i++) {
            MulticallData memory mData = mDataArr[i];

            require(mData.recipient == address(0) || 
                mData.recipient == RECIPIENT_EXECUTEE || 
                mData.recipient == RECIPIENT_UNISWAP_ROUTER || 
                mData.recipient == __executee, "Recipient not whitelisted");
            
            if (mData.amountIn > 0) {
                require(allowAllFromTokens || fromToken == mData.tokenIn, "Source token not whitelisted");

                if (_tokenInAmount[mData.tokenIn] == 0) {
                    _tokenIn.push(mData.tokenIn);
                }
                _tokenInAmount[mData.tokenIn] += mData.amountIn;

                emit ExecuteUniswapInTransaction(transactionId, msg.sender, Constant.UNISWAP_ROUTER, mData.tokenIn, mData.amountIn);
            }

            if (mData.amountOut > 0 && (mData.recipient == RECIPIENT_EXECUTEE || mData.recipient == __executee)) {
                require(allowAllToTokens || toTokensMapping[mData.tokenOut], "Target token not whitelisted");

                emit ExecuteUniswapOutTransaction(transactionId, msg.sender, Constant.UNISWAP_ROUTER, mData.tokenOut, mData.amountOut);
            }
        }

        if (!allowAnyAmount || amountPercentage < 100) {
            for (uint i = 0; i < _tokenIn.length; i++) {
                address tokenIn = _tokenIn[i];
                uint256 amount = _tokenInAmount[tokenIn];

                uint256 tokenInBalanceBeforeSwap;
                if(tokenIn == Denominations.ETH) {
                    tokenInBalanceBeforeSwap = __executee.balance + amount;
                } else {
                    tokenInBalanceBeforeSwap = IERC20(tokenIn).balanceOf(__executee) + amount;
                }

                require(allowAnyAmount || amount <= totalAmount, "Exceeded max amount");
                require(_checkAmountPercentageValid(tokenInBalanceBeforeSwap, amount), "Exceeded percentage");     
                            
                if(!allowAnyAmount) {
                    totalAmount -= amount;
                }
            }
        }

    }

    function _executeWETH9Call(uint256 transactionId, address to, bytes memory executeData, uint256 value) private {
        address __executee = executee();

        IBudgetApprovalExecutee(__executee).executeByBudgetApproval(to, executeData, value);
        (
            address tokenIn,
            address tokenOut,
            uint256 amount
        ) = this.decodeWETH9Call(executeData, value);

        uint256 tokenInBalanceBeforeSwap;
        if(tokenIn == Denominations.ETH) {
            tokenInBalanceBeforeSwap = __executee.balance + amount;
        } else {
            tokenInBalanceBeforeSwap = IERC20(tokenIn).balanceOf(__executee) + amount;
        }

        require(allowAllFromTokens || fromToken == tokenIn, "Source token not whitelisted");
        require(allowAllToTokens || toTokensMapping[tokenOut], "Target token not whitelisted");
        require(allowAnyAmount || amount <= totalAmount, "Exceeded max amount");
        require(_checkAmountPercentageValid(tokenInBalanceBeforeSwap, amount), "Exceeded percentage");
        
        if(!allowAnyAmount) {
            totalAmount -= amount;
        }

        emit ExecuteWETH9Transaction(transactionId, msg.sender, WETH9(), tokenIn, tokenOut, amount);
    }

    function _checkAmountPercentageValid(uint256 balanceOfToken, uint256 amount) private view returns (bool) {
        if (amountPercentage == 100) return true;

        if (balanceOfToken == 0) return false;

        return amount <= balanceOfToken * amountPercentage / 100;
    }

    function _addToToken(address token) private {
        require(!toTokensMapping[token], "Duplicated token in target token list");
        toTokensMapping[token] = true;
        emit AllowToToken(token);
    }

}