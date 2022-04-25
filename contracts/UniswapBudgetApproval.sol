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

    bool public allowAllToTokens;
    mapping(address => bool) public toTokensMapping;

    function initialize(
       InitializeParams calldata params,
        // extra params
        bool _allowAllToTokens,
        address[] calldata _toTokens
    ) public initializer {
        __BudgetApproval_init(params);

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

        (address tokenIn, address tokenOut, uint256 amountIn,) = decodeWithResult(to, data, value, result);
        require(checkValid(tokenIn, tokenOut, amountIn, true), "transaction not valid");

        _updateTotalAmount(amountIn);
        _updateUsageCount();

    }

    function checkValid(address _tokenIn, address _tokenOut, uint256 _amount, bool executed) public view returns(bool valid) {
        return checkTokenValid(_tokenIn) && 
               checkAmountValid(_amount) && 
               checkAmountPercentageValid(_amount, executed) &&
               checkToTokenValid(_tokenOut) &&
               checkUsageCountValid();
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

    function encodeInitializeData(
       InitializeParams calldata params,
        // extra params
        bool _allowAllTokens,
        address[] calldata _toTokens
    ) public pure returns (bytes memory data) {
        return abi.encodeWithSelector(
           this.initialize.selector,
            params,
            _allowAllTokens,
            _toTokens
        );
    }

    function decodeInitializeData(bytes memory _data) public pure returns (InitializeParams memory, bool, address[] memory) {

        if(_data.toBytes4(0) != this.initialize.selector) {
            revert("unexpected function");
        }

        return abi.decode(_data.slice(4, _data.length - 4), (InitializeParams,bool,address[]));
    }
}