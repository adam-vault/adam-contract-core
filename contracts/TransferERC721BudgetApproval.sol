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
    uint8 public amountPercentage;

    function initialize(InitializeParams calldata params) public initializer {
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

}