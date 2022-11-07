// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./lib/Constant.sol";

import "./interface/IBudgetApprovalExecutee.sol";

interface IGMXRouter {
    function approvePlugin(address _plugin) external;
    function plugins(address _plugin) external view returns (bool);

}
contract GMXAnyTokenBudgetApproval is CommonBudgetApproval {
    using BytesLib for bytes;

    string public constant override name = "GMX Any Token Budget Approval";
    event ExecuteGMXAnyTokenTransaction(
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
        InitializeParams calldata params
    ) external initializer {
        __BudgetApproval_init(params);
    }

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address to";
        arr[1] = "bytes data";
        arr[2] = "uint256 value";
        return arr;
    }


    function approveTokenForGMX(address _to, address _fromToken) public {

        address _executee = executee();

        require(msg.sender == _executee ||
          msg.sender == executor() ||
          ITeam(team()).balanceOf(msg.sender, executorTeamId()) > 0, "Executor not whitelisted in budget"
        );
        
        require(_to == Constant.GMX_ROUTER || IGMXRouter(Constant.GMX_ROUTER).plugins(_to), "unsupported gmx plugin");

        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", _to, type(uint256).max);
        IBudgetApprovalExecutee(_executee).executeByBudgetApproval(_fromToken, data, 0);
    }


    function approvePlugin(address _plugin) public {

        address _executee = executee();

        require(msg.sender == _executee ||
          msg.sender == executor() ||
          ITeam(team()).balanceOf(msg.sender, executorTeamId()) > 0, "Executor not whitelisted in budget"
        );

        bytes memory data = abi.encodeWithSignature("approvePlugin(address)", _plugin);
        IBudgetApprovalExecutee(_executee).executeByBudgetApproval(Constant.GMX_ROUTER, data, 0);
    }


    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address to, bytes memory executeData, uint256 value) = abi.decode(data,(address, bytes, uint256));


        IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
            _token,
            executeData,
            0
        );

        emit ExecuteTransferERC20Transaction(
            transactionId,
            msg.sender,
            to,
            _token,
            value
        );
    }

}
