// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interface/IBudgetApprovalExecutee.sol";

contract VestingERC20BudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "Vesting ERC20 Budget Approval";

    event ExecuteVestingERC20Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );

    // Terminology:
    //
    // |<-- cycle 1 --> <-- cycle 2 --> <-- cycle 3 --> <-- cycle 4 --> 
    // |<------ cliff ------> 
    // |
    // |<-- Init Token Amount
    // |<-- Budget Start Time                           
    // |<----------------------- (vesting period) -------------------->
    //     
    // Total Period = Cycle Period * Cycle Count
    // Total Amount = Init Amount + Cycle Amount * Cycle Count

    // Token to be vested (should be ERC20)
    address public token;

    // The beneficial address
    address public toAddress;

    // Period of Cliff
    uint256 public cliffPeriod;

    // Period per cycle
    uint256 public cyclePeriod;
    
    // Number of periods
    uint256 public cycleCount;

    // Vesting Amount in each cycle 
    uint256 public cycleTokenAmount;

    // Token Amount after cliff
    uint256 public initTokenAmount;

    // Amount of tokens released
    uint256 private releasedTokenAmount;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        InitializeParams calldata params,
        address _token,
        address _toAddress,
        uint256 _cliffPeriod,
        uint256 _cyclePeriod,
        uint256 _cycleCount,
        uint256 _cycleTokenAmount,
        uint256 _initTokenAmount
    ) external initializer {
        __BudgetApproval_init(params);

        token = _token;
        toAddress = _toAddress;
        cliffPeriod = _cliffPeriod;
        cyclePeriod = _cyclePeriod;
        cycleCount = _cycleCount;
        cycleTokenAmount = _cycleTokenAmount;
        initTokenAmount = _initTokenAmount;
        releasedTokenAmount = 0;
    }

    function executeParams() external pure override returns (string[] memory) {
        // TODO
        string[] memory arr = new string[](1);
        arr[0] = "uint256 value";
        return arr;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (uint256 amount) = abi.decode(
            data,
            (uint256)
        );
        bytes memory executeData = abi.encodeWithSelector(
            IERC20.transfer.selector,
            toAddress,
            amount
        );
        uint256 _releasedTokenAmount = releasedTokenAmount;

        IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
            token,
            executeData,
            0
        );

        // Check if cliff period passed
        require(isCliffPassed(), "Cliff Period not passed");

        // Check current relesable amount
        require(amount <= currentReleasableAmount(), "Exceeded current relesable token amount");

        releasedTokenAmount = _releasedTokenAmount + amount;

        emit ExecuteVestingERC20Transaction(
            transactionId,
            msg.sender,
            toAddress,
            token,
            amount
        );
    }

    /**
    * @dev Returns the remaining token amount of the overall vesting
    */
    function remainingAmount() public view returns (uint256) {
        return totalAmount() - releasedAmount();
    }

    /**
    * @dev Returns the total amount of tokens that will be released over the entire vesting period.
    */
    function totalAmount() public view returns (uint256) {
        return initTokenAmount + cycleTokenAmount * cycleCount;   
    }

    /**
    * @dev Returns the amount of tokens that has been released to the beneficial address.
    */
    function releasedAmount() public view returns (uint256) {
        return releasedTokenAmount;   
    }

    /**
    * @dev Returns whether the cliff period has passed
    */
    function isCliffPassed() public view returns (bool) {
        return block.timestamp > CommonBudgetApproval.startTime() + cliffPeriod;
    }


    /**
    * @dev Returns the current relesable token amount of the vesting
    */
    function currentReleasableAmount() public view returns (uint256) {

        if (!isCliffPassed()) {
            return 0;
        }

        if (cyclePeriod == 0) {
            return initTokenAmount - releasedTokenAmount;
        }

        uint256 cyclePassed = Math.min((block.timestamp - CommonBudgetApproval.startTime()) / cyclePeriod, cycleCount);
        return initTokenAmount + cyclePassed * cycleTokenAmount - releasedTokenAmount;
    }
}
