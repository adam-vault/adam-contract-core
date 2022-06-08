// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract TransferERC721BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Transfer ERC721 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount
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
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 tokenId";
        return arr;
    }

    function _execute(
        bytes memory data
    ) internal override {
        (address token, address to, uint256 tokenId) = abi.decode(data,(address, address, uint256));

        bytes memory executeData = abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", executee, to, tokenId);
        IBudgetApprovalExecutee(executee).executeByBudgetApproval(token, executeData, 0);

        require(allowAllAddresses || addressesMapping[to], "invalid recipient");
        require(tokensMapping[token], "invalid token");
        require(allowAnyAmount || 1 <= totalAmount, "invalid amount");

        if(!allowAnyAmount) {
            totalAmount -= 1;
        }
    }
    function _addToken(address token) internal {
        require(!tokensMapping[token], "duplicate token");
        tokens.push(token);
        tokensMapping[token] = true;
        emit AllowToken(token);
    }

    function _addToAddress(address to) internal {
        require(!addressesMapping[to], "duplicate token");
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }

}