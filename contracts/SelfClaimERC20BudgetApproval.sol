// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "./interface/IBudgetApprovalExecutee.sol";
import "./lib/Constant.sol";

/**
 * SelfClaimERC20BudgetApproval Contract
 *
 * This contract is a budget approval for self claimed transactions for ERC20 tokens. It implements the CommonBudgetApproval contract
 * and the IBudgetApprovalExecutee interface. The transactions must be signed by a validator and are subject to conditions
 * such as recipient address whitelist and claim amount limit.
 *
 **/
contract SelfClaimERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Self Claim ERC20 Budget Approval";

    bool public allowAllAddresses;
    mapping(address => bool) public addressesMapping;
    mapping(address => bool) private claimedAddresses;
    bool public allowAllTokens;
    address public token;
    uint256 public fixAmount; //is the maximum amount that can be claimed.
    address public validator; //is the address of the validator.

    error SignatureNotCorrrect(); //  occurs when the signature is not correct.
    error AddressClaimed(); //occurs when an address has already claimed the maximum amount.
    error RecipientNotWhitelisted(); //occurs when the recipient is not whitelisted.
    error DuplicatedToAddress(); //occurs when a duplicate address is added to the whitelist.

    event ExecuteSelfClaimTransferERC20Transaction(
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

    /**
     * @dev Initializes the budget approval with the given parameters.
     * @param params Initialization parameters.
     * @param _allowAllAddresses If set to true, any address can receive.
     * @param _toAddresses Array of whitelisted addresses that are allowed to receive.
     * @param _allowAllTokens If set to true, any token can be used.
     * @param _token Address of the token to be used.
     * @param _fixAmount Maximum amount that can be claimed for each receiver.
     * @param _validator Address of the validator.
     */
    function initialize(
        InitializeParams calldata params,
        bool _allowAllAddresses,
        address[] memory _toAddresses,
        bool _allowAllTokens,
        address _token,
        uint256 _fixAmount,
        address _validator
    ) external initializer {
        __BudgetApproval_init(params);

        allowAllAddresses = _allowAllAddresses;
        for (uint256 i = 0; i < _toAddresses.length; i++) {
            _addToAddress(_toAddresses[i]);
        }

        allowAllTokens = _allowAllTokens;
        token = _token;
        fixAmount = _fixAmount;
        validator = _validator;
    }

    function _isExecutor(address)
        internal
        view
        virtual
        override
        returns (bool)
    {
        return true;
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address to";
        arr[1] = "uint256 nonce";
        arr[2] = "bytes signature";
        return arr;
    }

    /**
     * @dev The transaction logic.
     * @dev revert SignatureNotCorrrect If the signature is not correct.
     * @dev revert RecipientNotWhitelisted If the recipient is not whitelisted.
     * @dev revert AddressClaimed If the address has already claimed the maximum amount.
     * @param transactionId ID of the transaction.
     * @param data Execute data in the format `(address to, uint256 value, bytes signature)`.
     */
    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address to, uint256 nonce, bytes memory signature) = abi.decode(
            data,
            (address, uint256, bytes)
        );

        if (validator != address(0) && !verify( validator, to, nonce, signature)) {
            revert SignatureNotCorrrect();
        }

        if (token == Constant.NATIVE_TOKEN) {
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                to,
                "",
                fixAmount
            );
        } else {
            bytes memory executeData = abi.encodeWithSelector(
                IERC20.transfer.selector,
                to,
                fixAmount
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                token,
                executeData,
                0
            );
        }

        if (!allowAllAddresses && !addressesMapping[to]) {
            revert RecipientNotWhitelisted();
        }

        if (claimedAddresses[to]) {
            revert AddressClaimed();
        }

        claimedAddresses[to] = true;

        emit ExecuteSelfClaimTransferERC20Transaction(
            transactionId,
            msg.sender,
            to,
            token,
            fixAmount
        );
    }

    /**
     * @dev Adds a new address to the whitelist.
     * @dev revert DuplicatedToAddress If the address is already in the whitelist.
     * @param to Address to be added to the whitelist.
     */
    function _addToAddress(address to) internal {
        if (addressesMapping[to]) {
            revert DuplicatedToAddress();
        }
        addressesMapping[to] = true;
        emit AllowAddress(to);
    }
    
    function getMessageHash(
        address _to,
        uint _nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _nonce));
    }

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
            );
    }

    function verify(
        address _signer,
        address _to,
        uint _nonce,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_to, _nonce);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        return ECDSA.recover(ethSignedMessageHash, signature) == _signer;
    }
}
