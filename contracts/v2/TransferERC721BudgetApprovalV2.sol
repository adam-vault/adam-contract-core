// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApprovalV2.sol";
import "../lib/BytesLib.sol";

import "../interface/IBudgetApprovalExecutee.sol";

contract TransferERC721BudgetApprovalV2 is CommonBudgetApprovalV2 {
    using BytesLib for bytes;

    string public constant override name = "Transfer ERC721 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    bool public allowAllTokens;
    address[] public tokens;
    mapping(address => bool) public tokensMapping;
    bool public allowAnyAmount;
    uint256 public totalAmount;

    // v2
    uint256[] public toTeamIds;
    mapping(uint256 => bool) public toTeamIdsMapping;

    event AllowTeam(uint256 indexed teamId);
    event ExecuteTransferERC721Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 tokenId
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        bool _allowAllTokens,
        address[] memory _tokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        // v2
        uint256[] memory _toTeamIds
    ) external initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for (uint256 i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }

        allowAllTokens = _allowAllTokens;
        for (uint256 i = 0; i < _tokens.length; i++) {
            _addToken(_tokens[i]);
        }

        for (uint256 i = 0; i < _toTeamIds.length; i++) {
            _addToTeam(_toTeamIds[i]);
        }

        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 tokenId";
        return arr;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address token, address to, uint256 tokenId) = abi.decode(
            data,
            (address, address, uint256)
        );
        address __executee = executee();
        bool _allowAnyAmount = allowAnyAmount;
        uint256 _totalAmount = totalAmount;

        bytes memory executeData = abi.encodeWithSignature(
            "safeTransferFrom(address,address,uint256)",
            __executee,
            to,
            tokenId
        );
        IBudgetApprovalExecutee(__executee).executeByBudgetApproval(
            token,
            executeData,
            0
        );

        require(
            allowAllAddresses ||
                addressesMapping[to] ||
                _checkIsToTeamsMember(to),
            "Recipient not whitelisted in budget"
        );
        require(
            allowAllTokens || tokensMapping[token],
            "Token not whitelisted in budget"
        );
        require(
            _allowAnyAmount || 1 <= _totalAmount,
            "Exceeded max budget transferable amount"
        );

        if (!_allowAnyAmount) {
            totalAmount = _totalAmount - 1;
        }
        emit ExecuteTransferERC721Transaction(
            transactionId,
            msg.sender,
            to,
            token,
            tokenId
        );
    }

    function _addToken(address token) internal {
        require(!tokensMapping[token], "Duplicated Item in source token list");
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
        address[] memory toArray;
        for (uint256 i = 0; i < toTeamIds.length; i++) {
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
