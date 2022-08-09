// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./base/PriceResolver.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "hardhat/console.sol";

contract TransferERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Transfer ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    bool public allowAllTokens;
    address public token;
    bool public allowAnyAmount;
    uint256 public totalAmount;
    uint8 public amountPercentage;

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        bool _allowAllTokens,
        address _token,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) public initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for(uint i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }
        allowAllTokens = _allowAllTokens;
        token = _token;
        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        amountPercentage = _amountPercentage;
    }

    function executeParams() public pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        bytes memory data
    ) internal override {
        (address _token, address to, uint256 value) = abi.decode(data,(address, address, uint256));
        bytes memory executeData = abi.encodeWithSelector(IERC20.transfer.selector, to, value);
        
        IBudgetApprovalExecutee(executee).executeByBudgetApproval(token, executeData, 0);

        require(allowAllAddresses || addressesMapping[to], "Recipient not whitelisted in budget");
        require(allowAllTokens || token == _token, "Token not whitelisted in budget");
        require(allowAnyAmount || value <= totalAmount, "Exceeded max budget transferable amount");
        require(checkAmountPercentageValid(value, _token), "Exceeded max budget transferable percentage");

        if(!allowAnyAmount) {
            totalAmount -= value;
        }
    }

    function checkAmountPercentageValid(uint256 amount, address _token) internal view returns (bool) {
        if (amountPercentage == 100) return true;

        uint256 _totalAmount = amount + IERC20(_token).balanceOf(executee);
        if (_totalAmount == 0) return false;

        return amount <= _totalAmount * amountPercentage / 100;
    }

    function _addToAddress(address to) internal {
        require(!addressesMapping[to], "duplicate token");
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }
}