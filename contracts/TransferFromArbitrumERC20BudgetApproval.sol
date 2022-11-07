// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
import "./lib/Constant.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./base/PriceResolver.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./interface/IBudgetApprovalExecutee.sol";
import "./TransferERC20BudgetApproval.sol";


interface IInbox {
    function createRetryableTicket(
        address destAddr,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        address excessFeeRefundAddress,
        address callValueRefundAddress,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external payable returns (uint256);
}

interface L2GatewayRouter {
    function outboundTransfer(
        address _l1token,
        address _to,
        uint256 _amount,
        bytes calldata _data
    ) external payable returns (bytes memory);
}

interface ArbSys {
    function withdrawEth(address to) external payable;
}

contract TransferFromArbitrumERC20BudgetApproval is
    TransferERC20BudgetApproval
{
    
    event ExecuteTransferFromArbitrumERC20Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](3);
        arr[0] = "address l1token";
        arr[1] = "address to";
        arr[2] = "uint256 value";

        return arr;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address l1token, address to, uint256 value) = abi.decode(
            data,
            (address, address, uint256)
        );

        bool _allowAnyAmount = allowAnyAmount;
        uint256 _totalAmount = totalAmount;

        if (l1token == Denominations.ETH) {
            bytes memory executeData = abi.encodeWithSelector(
                ArbSys.withdrawEth.selector,
                to
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                address(100),
                executeData,
                value
            );
        } else {
            bytes memory executeData = abi.encodeWithSelector(
                L2GatewayRouter.outboundTransfer.selector,
                l1token,
                to,
                value,
                ""
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                Constant.ARBITRUM_L2_GATEWAY_ROUTER,
                executeData,
                0
            );
        }

        require(
            allowAllAddresses ||
                addressesMapping[to] ||
                _checkIsToTeamsMember(to),
            "Recipient not whitelisted in budget"
        );
        require(
            allowAllTokens || token == l1token,
            "Token not whitelisted in budget"
        );
        require(
            _allowAnyAmount || value <= _totalAmount,
            "Exceeded max budget transferable amount"
        );

        if (!_allowAnyAmount) {
            totalAmount = _totalAmount - value;
        }

        emit ExecuteTransferFromArbitrumERC20Transaction(
            transactionId,
            msg.sender,
            to,
            l1token,
            value
        );
    }

}
