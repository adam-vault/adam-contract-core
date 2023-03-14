// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

contract SimpleMulticall {
    address public owner;

    error Unauthorized();
    error InputLengthNotMatch();
    error MsgValueNotMatch();
    error ContractCallFail(bytes);
    
    constructor(address _owner) {
        owner = _owner;
    }

    function multicall(address[] calldata targets, bytes[] calldata data, uint256[] calldata values) public payable returns (bytes[] memory) {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        if (targets.length != values.length) {
            revert InputLengthNotMatch();
        }
        if (targets.length != data.length) {
            revert InputLengthNotMatch();
        }

        bytes[] memory results = new bytes[](targets.length);
        uint256 sum = 0;

        for (uint256 i = 0; i< targets.length; i++) {
            (bool success, bytes memory result) = address(targets[i]).call{value: values[i]}(data[i]);
            sum = sum + values[i];
            if (!success) {
                revert ContractCallFail(result);
            }
            results[i] = result;
        }

        if (sum != msg.value) {
            revert MsgValueNotMatch();
        }

        return results;
    }
}