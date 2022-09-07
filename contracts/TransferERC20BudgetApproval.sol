// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interface/IBudgetApprovalExecutee.sol";

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
    event execute(address to, address token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        bool _allowAllTokens,
        address _token,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage
    ) external initializer {
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

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(
        uint256,
        bytes memory data
    ) internal override {
        (address _token, address to, uint256 value) = abi.decode(data,(address, address, uint256));
        bytes memory executeData = abi.encodeWithSelector(IERC20.transfer.selector, to, value);
        bool _allowAnyAmount = allowAnyAmount;
        uint256 _totalAmount = totalAmount;
        uint256 balanceBeforeExecute = IERC20(_token).balanceOf(executee());

        IBudgetApprovalExecutee(executee()).executeByBudgetApproval(_token, executeData, 0);

        require(allowAllAddresses || addressesMapping[to], "Recipient not whitelisted in budget");
        require(allowAllTokens || token == _token, "Token not whitelisted in budget");
        require(_allowAnyAmount || value <= _totalAmount, "Exceeded max budget transferable amount");
        require(checkAmountPercentageValid(balanceBeforeExecute, value), "Exceeded max budget transferable percentage");

        if(!_allowAnyAmount) {
            totalAmount = _totalAmount - value;
        }
        emit execute(to, _token, value);
    }

    function checkAmountPercentageValid(uint256 balanceOfToken, uint256 amount) internal view returns (bool) {
        uint256 _amountPercentage = amountPercentage;
        if (_amountPercentage == 100) return true;
        if (balanceOfToken == 0) return false;

        return amount <= balanceOfToken * _amountPercentage / 100;
    }

    function _addToAddress(address to) internal {
        require(!addressesMapping[to], "Duplicated address in target address list");
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }
}