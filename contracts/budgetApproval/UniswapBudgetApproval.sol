// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./CommonBudgetApproval.sol";
import "../lib/BytesLib.sol";
import "../dex/UniswapSwapper.sol";

import "../interface/IDao.sol";

contract UniswapBudgetApproval is CommonBudgetApproval {

    using BytesLib for bytes;

    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;

    function initialize(
        address _dao, 
        address _executor, 
        string memory _text, 
        string memory _transactionType,
        address[] memory _addresses,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage,
        // specific var
        address[] memory _toTokens
    ) public initializer {
        CommonBudgetApproval.initialize(
            _dao,
            _executor,
            _text,
            _transactionType,
            _addresses,
            _tokens,
            _allowAnyAmount,
            _totalAmount,
            _amountPercentage
        );

        if(_toTokens.length > 0) {
            for(uint i = 0; i < _toTokens.length; i++) {
                toTokensMapping[_toTokens[i]] = true;
            }
        } else {
            allowAllToTokens = true;
        }
    }

    function execute(address to, bytes memory data, uint256 value) public override onlyDao {

        // approve(address,uint256) for ERC20
        if(data.toBytes4(0) == 0x095ea7b3) {
            (bool approved,) = to.call(data);
            require(approved == true, "approved ERC20 failed");

            IDao(dao).approveERC20(to, data);
            return;
        }

        (,address requiredToken, uint256 requiredAmount) = getRequiredAmount(to, data, value);
        
        // Withdraw required token
        (address[] memory members, uint256[] memory amounts) = _getBurnAmountsOfAllMembers(requiredToken, requiredAmount);
        uint256 totalAmount = IDao(dao).withdrawByBudgetApproval(requiredToken, members, amounts, false);

        (bool success, bytes memory results) = to.call{ value: value }(data);
        require(success == true, "execution failed");

        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) = decodeWithResult(to, data, value, results);
        require(checkValid(tokenIn, tokenOut, amountIn, true) == true, "transaction not valid");

        _updateTotalAmount(amountIn);

        // return unused amount (triggered when input is estimated)
        if(amountIn < requiredAmount) {
            (, uint256[] memory unusedAmounts) = _getMintAmountOfMembers(requiredAmount - amountIn, members, amounts, totalAmount);
            if(tokenIn == UniswapSwapper.ETH_ADDRESS) {
                // ETH need to transfer from BA directly
                payable(msg.sender).transfer(requiredAmount - amountIn);
                IDao(dao).depositByBudgetApproval(tokenIn, members, unusedAmounts, true);
            } else {
                // ERC20 is transferred by dao
                IERC20(tokenIn).approve(dao, requiredAmount - amountIn);
                IDao(dao).depositByBudgetApproval(tokenIn, members, unusedAmounts, false);
            }
        }

        // deposit swapped token
        (, uint256[] memory mintAmounts) = _getMintAmountOfMembers(amountOut, members, amounts, totalAmount);
        IDao(dao).depositByBudgetApproval(tokenOut, members, mintAmounts, true);
    }

    function checkValid(address _tokenIn, address _tokenOut, uint256 _amount, bool executed) public view returns(bool valid) {
        return checkTokenValid(_tokenIn) && 
               checkAmountValid(_amount) && 
               checkAmountPercentageValid(_amount, executed) &&
               checkToTokenValid(_tokenOut);
    }

    function checkToTokenValid(address _token) public view returns (bool) {
        return allowAllToTokens || toTokensMapping[_token];
    }

    function decodeWithResult(address to, bytes memory data, uint256 value, bytes memory _results) public pure returns (address, address, uint256, uint256) {
        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) = UniswapSwapper.decodeUniswapData(to, data, value, _results);
        require(!estimatedIn && !estimatedOut, "unexpected result");
        return (tokenIn, tokenOut, amountIn, amountOut);
    }

    function decode(address to, bytes memory data, uint256 value) public pure returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {
        return UniswapSwapper.decodeUniswapData(to, data, value);
    }

    function getRequiredAmount(address to, bytes memory data, uint256 value) public pure override returns(bool isRequireToken, address requiredToken, uint256 requiredAmount) {
        (address _tokenIn,, uint256 _amountIn,,,) = decode(to, data, value);

        if(_amountIn > 0) {
            isRequireToken = true;
            requiredToken = _tokenIn;
            requiredAmount = _amountIn;
        }
    }
}