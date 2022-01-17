// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract Manageable {
    enum Role { OWNER, MANAGER }
    struct Manager {
        Role role;
        uint index;
        bool isExist;
    }

    address public owner;
    address[] public managerList;
    mapping(address => Manager) public managerDetails;

    modifier onlyOwner() {
        require(isOwner(msg.sender), "msg.sender is not owner");
        _;
    }

    modifier onlyManager() {
        require(isManager(msg.sender), "msg.sender is not manager");
        _;
    }

    function _initOwner(address _owner) internal {
        require(owner == address(0x0), "owner is initialized");
        owner = _owner;
        managerDetails[_owner] = Manager(Role.OWNER, managerList.length, true);
    }

    function isManager(address _address) public view returns (bool) {
        return managerDetails[_address].isExist;
    }

    function isOwner(address _address) public view virtual returns (bool) {
        return _address == owner;
    }

    function managerCount() public view returns (uint) {
        return managerList.length;
    }

    function addManagers(address[] calldata _addresses) public onlyOwner {
        require(
            _addresses.length > 0,
            "addresses is empty"
        );
        for (uint i = 0; i < _addresses.length; i++) {
            _addManager(_addresses[i]);
        }
    }

    function _addManager(address _address) internal {
        require(_address != address(0x0), "addresses is empty");
        require(!managerDetails[_address].isExist, "address already is manager" );
        managerDetails[msg.sender] = Manager(Role.MANAGER, managerList.length, true);
    }

    function removeManagers(address[] calldata _addresses) public onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            require(managerDetails[_addresses[i]].isExist, "address is not a manager" );
            require(_addresses[i] != owner, "address is the owner" );

            uint256 length = managerList.length;
            uint256 index = managerDetails[_addresses[i]].index;

            address last = managerList[length - 1];
            managerList[index] = last;
            managerList.pop();
            delete managerDetails[_addresses[i]];
        }
    }

    function changeOwner(address _address) public onlyOwner {
        require(_address != owner, "address is the original owner" );
        if (!isManager(_address)) {
            _addManager(_address);
        }
        managerDetails[owner].role = Role.MANAGER;
        managerDetails[_address].role = Role.OWNER;
        owner = _address;
    }
}