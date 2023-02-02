// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./interface/IBudgetApprovalExecutee.sol";
import "./interface/ILiquidPool.sol";
import "./interface/IDao.sol";
import "./interface/IMembership.sol";

contract DepositRewardBudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;
    using AddressUpgradeable for address;

    string public constant override name = "Deposit Reward Budget Approval";

    address payable public liquidPool;
    address public token;
    bool public allowAnyAmount;
    uint256 public totalAmount;

    uint256 public referrerRewardAmount;
    uint256 public refereeRewardAmount;

    event Refer(uint256 indexed referee, uint256 indexed referrer);
    event ExecuteReferrerRewardTransaction(
        uint256 indexed id,
        address indexed executor,
        address indexed referrer,
        address referee,
        address _token,
        uint256 _referrerRewardAmount,
        uint256 _refereeRewardAmount
    );
    error InvalidContract(address addr);
    error MsgValueNotMatch();
    error InsufficientSupply();
    error NotQualify();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        InitializeParams calldata params,
        address _liquidPool,
        address _token,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint256 _referrerRewardAmount,
        uint256 _refereeRewardAmount
    ) external initializer {
        __BudgetApproval_init(params);

        if (!_liquidPool.isContract()) {
            revert InvalidContract(_liquidPool);
        }
        if (!_token.isContract()) {
            revert InvalidContract(_token);
        }

        liquidPool = payable(_liquidPool);
        token = _token;
        allowAnyAmount = _allowAnyAmount;
        totalAmount = _totalAmount;
        
        referrerRewardAmount = _referrerRewardAmount;
        refereeRewardAmount = _refereeRewardAmount;
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](4);
        arr[0] = "address receiver";
        arr[1] = "address asset";
        arr[2] = "uint256 amount";
        arr[3] = "address referrer";
        return arr;
    }

    function _isExecutor(address) internal pure override returns (bool) {
        // anyone can call
        return true;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address _receiver, address _asset, uint256 _amount, address _referrer) = abi.decode(
            data,
            (address, address, uint256, address)
        );

        if (_asset == Denominations.ETH) {
            if (msg.value != _amount) {
                revert MsgValueNotMatch();
            }
            deposit(_receiver);
        } else {
            depositToken(_receiver, _asset, _amount);

        }

        _issueReward(_receiver, _referrer);

        emit ExecuteReferrerRewardTransaction(
            transactionId,
            msg.sender,
            _referrer,
            _receiver,
            token,
            referrerRewardAmount,
            refereeRewardAmount
        );

    }

    function _issueReward(address referee, address referrer) internal {
        uint256 _totalAmount = totalAmount;
        uint256 _referrerRewardAmount = referrerRewardAmount;
        uint256 _refereeRewardAmount = refereeRewardAmount;
        bool _allowAnyAmount = allowAnyAmount;
        address _executee = executee();
        address _token = token;

        address dao = ILiquidPool(liquidPool).owner();
        address membership = IDao(payable(dao)).membership();

        if (IMembership(membership).isMember(referee) || IMembership(membership).wasMember(referee)) {
            revert NotQualify();
        }

        if (!_allowAnyAmount) {
            if (_totalAmount < _referrerRewardAmount + _refereeRewardAmount) {
                revert InsufficientSupply();
            }
            totalAmount = _totalAmount - _referrerRewardAmount - _refereeRewardAmount;
        }

        if (_referrerRewardAmount > 0) {
            IBudgetApprovalExecutee(_executee).executeByBudgetApproval(
                _token,
                abi.encodeWithSelector(
                    IERC20.transfer.selector,
                    referrer,
                    _referrerRewardAmount
                ),
                0
            );
        }

        if (_refereeRewardAmount > 0) {
            IBudgetApprovalExecutee(_executee).executeByBudgetApproval(
                _token,
                abi.encodeWithSelector(
                    IERC20.transfer.selector,
                    referee,
                    _refereeRewardAmount
                ),
                0
            );
        }

    }

    function deposit(address receiver) internal {
        ILiquidPool(liquidPool).deposit{value: msg.value}(receiver);
    }

    function depositToken(address receiver, address asset, uint256 amount) internal {
        address payable _liquidPool = liquidPool;

        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(_liquidPool, amount);
        
        ILiquidPool(_liquidPool).depositToken(receiver, asset, amount);
    }
}
