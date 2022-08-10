// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

contract MockLPDao {
    uint256 public locktime;
    uint256 public minDepositAmount;
    uint256 public minTokenToAdmit;
    address public memberToken;
    address public admissionToken;
    address public team;
    mapping(address => uint256) public firstDepositTime;
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
    function setAdmissionToken(address at) public {
        admissionToken = at;
    }
    function setMinDepositAmount(uint256 amount) public {
        minDepositAmount = amount;
    }
    function setFirstDepositTime(address account) public {
        firstDepositTime[account] = block.timestamp;
    } 
    function setMinTokenToAdmit(uint256 amount) public {
        minTokenToAdmit = amount;
    }
    function canCreateBudgetApproval(address) public pure returns (bool) {
        return true;
    } 
    function mintMember(address account) public {
        isMember[account] = true;
    }
    function setTeam(address _team) public {
      team = _team;
    }
}
