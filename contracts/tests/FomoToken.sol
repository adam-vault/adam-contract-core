// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract FomoToken is Initializable, ERC20VotesUpgradeable, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol)
        external
        initializer
    {
        __Ownable_init();
        __ERC20Permit_init(_name);
        __ERC20_init(_name, _symbol);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function mintToOwner(uint256 amount) external onlyOwner {
        _mint(owner(), amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 10;
    }

    uint256[50] private __gap;
}
