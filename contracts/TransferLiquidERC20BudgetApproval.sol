// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./base/PriceResolver.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract TransferLiquidERC20BudgetApproval is
    CommonBudgetApproval,
    PriceResolver
{
    using BytesLib for bytes;

    string public constant override name =
        "Transfer Liquid ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;

    // v2
    uint256[] public toTeamIds;
    mapping(uint256 => bool) public toTeamIdsMapping;

    event AllowTeam(uint256 indexed teamId);
    event ExecuteTransferLiquidERC20Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        address _baseCurrency,
        // v2
        uint256[] memory _toTeamIds
    ) external initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for (uint256 i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }

        for (uint256 i = 0; i < _tokens.length; i++) {
            _addToken(_tokens[i]);
        }

        for (uint256 i = 0; i < _toTeamIds.length; i++) {
            _addToTeam(_toTeamIds[i]);
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        __PriceResolver_init(_baseCurrency);
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        return arr;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address token, address to, uint256 value) = abi.decode(
            data,
            (address, address, uint256)
        );
        uint256 amountInBaseCurrency;
        uint256 _totalAmount = totalAmount;
        bool _allowAnyAmount = allowAnyAmount;

        if (token == Denominations.ETH) {
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                to,
                "",
                value
            );
        } else {
            bytes memory executeData = abi.encodeWithSelector(
                IERC20.transfer.selector,
                to,
                value
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                token,
                executeData,
                0
            );
        }

        amountInBaseCurrency = assetBaseCurrencyPrice(token, value);
        require(
            allowAllAddresses ||
                addressesMapping[to] ||
                _checkIsToTeamsMember(to),
            "Recipient not whitelisted in budget"
        );
        require(tokensMapping[token], "Token not whitelisted in budget");
        require(amountInBaseCurrency > 0, "Transfer amount should not be zero");
        require(
            _allowAnyAmount || amountInBaseCurrency <= _totalAmount,
            "Exceeded max budget transferable amount"
        );

        if (!_allowAnyAmount) {
            totalAmount = _totalAmount - amountInBaseCurrency;
        }
        emit ExecuteTransferLiquidERC20Transaction(
            transactionId,
            msg.sender,
            to,
            token,
            value
        );
    }

    function _addToken(address token) internal {
        require(!tokensMapping[token], "Duplicated Item in source token list.");
        require(
            canResolvePrice(token),
            "Unresolvable token in target token list."
        );

        tokens.push(token);
        tokensMapping[token] = true;
        emit AllowToken(token);
    }

    function _addToAddress(address to) internal {
        require(
            !addressesMapping[to],
            "Duplicated address in target address list"
        );
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }

    function tokensLength() public view returns (uint256) {
        return tokens.length;
    }

    function _checkIsToTeamsMember(address to) internal view returns (bool) {
        uint256 _toTeamIdsLength = toTeamIds.length;
        address[] memory toArray = new address[](_toTeamIdsLength);
        for (uint256 i = 0; i < _toTeamIdsLength; i++) {
            toArray[i] = to;
        }

        uint256[] memory balances = ITeam(team()).balanceOfBatch(
            toArray,
            toTeamIds
        );

        for (uint256 i = 0; i < balances.length; i++) {
            if (balances[i] > 0) {
                return true;
            }
        }
        return false;
    }

    function _addToTeam(uint256 teamId) internal {
        require(
            !toTeamIdsMapping[teamId],
            "Duplicated team in target team list"
        );
        toTeamIdsMapping[teamId] = true;
        toTeamIds.push(teamId);
        emit AllowTeam(teamId);
    }

    function toTeamsLength() public view returns (uint256) {
        return toTeamIds.length;
    }
}
