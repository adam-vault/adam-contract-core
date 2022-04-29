// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../Dao.sol";

contract MockLPDao {
    uint256 public locktime;
    uint256 public minMemberTokenToJoin;
    uint256 public minDepositAmount;
    address public memberToken;
    mapping(address => uint256) public firstDeposit;
    mapping(address => bool) public isMember;

    function byPassGovern(address) public pure returns (bool) {
        return true;
    }
    function govern(string memory) public pure returns (address) {
        return address(1);
    } 
    function setLocktime(uint256 lt) public {
        locktime = lt;
    } 
    function setMemberToken(address mt) public {
        memberToken = mt;
    }
    function setMinMemberTokenToJoin(uint256 amount) public {
        minMemberTokenToJoin = amount;
    }
    function setMinDepositAmount(uint256 amount) public {
        minDepositAmount = amount;
    }
    function canCreateBudgetApproval(address) public pure returns (bool) {
        return true;
    } 
    function mintMember(address account) public {
        isMember[account] = true;
    } 
    function setFirstDeposit(address account) public {
        firstDeposit[account] = block.timestamp;
    } 
}