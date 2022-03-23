// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";

import "./interface/IDao.sol";

contract UniswapBudgetApproval is CommonBudgetApproval, UniswapSwapper {

    using BytesLib for bytes;

    string public constant NAME = "Uniswap Budget Approval";

    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;

    function initialize(
       InitializeParams calldata params,
        // extra params
        bool _allowAllTokens,
        address[] calldata _toTokens
    ) public initializer {
        CommonBudgetApproval.initialize(params);

        allowAllToTokens = _allowAllTokens;
        for(uint i = 0; i < _toTokens.length; i++) {
            toTokensMapping[_toTokens[i]] = true;
        }
    }

    function execute(address to, bytes memory data, uint256 value) public override onlySelf {

        // approve(address,uint256) for ERC20
        if(data.toBytes4(0) == 0x095ea7b3) {
            (bool approved,) = to.call(data);
            require(approved == true, "approved ERC20 failed");

            IDao(dao).approveERC20(to, UniswapSwapper.UNISWAP_ROUTER, type(uint256).max);
            return;
        }

        (,address requiredToken, uint256 requiredAmount) = getRequiredAmount(to, data, value);
        
        // Withdraw required token
        (address[] memory members, uint256[] memory amounts) = _getAmountsOfAllMembersOnProRata(requiredToken, requiredAmount);
        uint256 totalAmount = IDao(dao).withdrawByBudgetApproval(requiredToken, members, amounts, false);

        (bool success, bytes memory results) = to.call{ value: value }(data);
        require(success == true, "execution failed");

        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) = decodeWithResult(to, data, value, results);
        require(checkValid(tokenIn, tokenOut, amountIn, true) == true, "transaction not valid");

        _updateTotalAmount(amountIn);

        // return unused amount (triggered when input is estimated)
        if(amountIn < requiredAmount) {
            (, uint256[] memory unusedAmounts) = _getAmountOfMembersByRatio(requiredAmount - amountIn, members, amounts, totalAmount);
            if(tokenIn == ETH_ADDRESS) {
                // transfer ETH when call function
                IDao(dao).depositByBudgetApproval{ value: requiredAmount - amountIn }(tokenIn, members, unusedAmounts, false);
            } else {
                // ERC20 is transferred by dao
                IERC20(tokenIn).approve(dao, requiredAmount - amountIn);
                IDao(dao).depositByBudgetApproval(tokenIn, members, unusedAmounts, false);
            }
        }

        // deposit swapped token
        (, uint256[] memory mintAmounts) = _getAmountOfMembersByRatio(amountOut, members, amounts, totalAmount);
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

    function decodeWithResult(address to, bytes memory data, uint256 value, bytes memory _results) public view returns (address, address, uint256, uint256) {
        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) = UniswapSwapper.decodeUniswapData(to, data, value, _results);
        require(!estimatedIn && !estimatedOut, "unexpected result");
        return (tokenIn, tokenOut, amountIn, amountOut);
    }

    function decode(address to, bytes memory data, uint256 value) public view returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) {
        return UniswapSwapper.decodeUniswapData(to, data, value);
    }

    function getRequiredAmount(address to, bytes memory data, uint256 value) public view returns(bool isRequireToken, address requiredToken, uint256 requiredAmount) {
        (address _tokenIn,, uint256 _amountIn,,,) = decode(to, data, value);

        if(_amountIn > 0) {
            isRequireToken = true;
            requiredToken = _tokenIn;
            requiredAmount = _amountIn;
        }
    }

    function encodeUniswapInitializeData(
       InitializeParams calldata params,
        // extra params
        bool _allowAllTokens,
        address[] calldata _toTokens
    ) public pure returns (bytes memory data) {
        return abi.encodeWithSignature(
            "initialize((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8),bool,address[])",
            params,
            _allowAllTokens,
            _toTokens
        );
    }

    function decodeUniswapInitializeData(bytes memory _data) public pure returns (InitializeParams memory, bool, address[] memory) {

        // initialize((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8),bool,address[])
        if(_data.toBytes4(0) != 0xf3d74a99) {
            revert("unexpected function");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (InitializeParams,bool,address[]));
    }
}