// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "./base/CommonBudgetApproval.sol";
import "./lib/BytesLib.sol";
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

interface L1GatewayRouter {
    function outboundTransfer(
        address _token,
        address _to,
        uint256 _amount,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        bytes calldata _data
    ) public payable returns (bytes memory);
}
contract TransferToArbitrumERC20BudgetApproval is
    TransferERC20BudgetApproval
{
    event ExecuteTransferToArbitrumERC20Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );

    function executeParams() external pure override returns (string[] memory) {
        string[] memory arr = new string[](6);
        arr[0] = "address token";
        arr[1] = "address to";
        arr[2] = "uint256 value";
        arr[3] = "uint256 maxSubmissionCost";
        arr[4] = "uint256 maxGas";
        arr[5] = "uint256 gasPriceBid";

        return arr;
    }

    function _execute(uint256 transactionId, bytes memory data)
        internal
        override
    {
        (address token, address to, uint256 value, uint256 maxSubmissionCost, uint256 maxGas, uint256 gasPriceBid) = abi.decode(
            data,
            (address, address, uint256, uint256, uint256, uint256)
        );

        uint256 _totalAmount = totalAmount;
        bool _allowAnyAmount = allowAnyAmount;

        if (token == Denominations.ETH) {
            bytes memory executeData = abi.encodeWithSelector(
                IInbox.createRetryableTicket.selector,
                to,
                value,
                maxSubmissionCost,
                executee(),
                executee(),
                maxGas,
                gasPriceBid,
                ""
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                to,
                executeData,
                value + maxSubmissionCost + (maxGas * gasPriceBid)
            );
        } else {
            bytes gatewayData = abi.encode(maxSubmissionCost, "");
            bytes memory executeData = abi.encodeWithSelector(
                L1GatewayRouter.outboundTransfer.selector,
                token,
                to,
                value,
                maxGas,
                gasPriceBid,
                gatewayData
            );
            IBudgetApprovalExecutee(executee()).executeByBudgetApproval(
                to,
                executeData,
                maxSubmissionCost + (maxGas * gasPriceBid)
            );
        }

        require(
            allowAllAddresses ||
                addressesMapping[to] ||
                _checkIsToTeamsMember(to),
            "Recipient not whitelisted in budget"
        );
        require(
            allowAllTokens || token == _token,
            "Token not whitelisted in budget"
        );
        require(
            _allowAnyAmount || value <= _totalAmount,
            "Exceeded max budget transferable amount"
        );

        if (!_allowAnyAmount) {
            totalAmount = _totalAmount - value;
        }

        emit ExecuteTransferToArbitrumERC20Transaction(
            transactionId,
            msg.sender,
            to,
            token,
            value
        );
    }
}
