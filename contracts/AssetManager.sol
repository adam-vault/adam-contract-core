// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./Strategy.sol";
import "./ToString.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";


interface IStrategy {
    function deposit() payable external;
}

contract AssetManager is ERC1155 {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;

    Counters.Counter private _tokenIds;
    address public manager;
    mapping(address => bool) public strategies;
    Strategy[] public strategyList;
    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;

    constructor() ERC1155("") {
        manager = msg.sender;
        Strategy s = new Strategy();
        strategyList.push(s);
        strategies[address(s)] = true;

        _tokenIds.increment();
        erc20ToTokenId[address(0)] = _tokenIds.current();
        tokenIdToErc20[_tokenIds.current()] = address(0);
    }

    modifier onlyManager() {
        require(
            manager == msg.sender,
            "msg.sender is not manager"
        );
        _;
    }

    modifier onlyStrategy() {
        require(
            strategies[msg.sender],
            "msg.sender is not strategy"
        );
        _;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        address realAddr = tokenIdToErc20[tokenId];
        if (realAddr == address(0)) {
            string memory ethMetadata = string(abi.encodePacked(
                "{\"name\": \"ETH (Adam)\", \"description\": \"\", \"attributes\":",
                "[{\"key\":\"address\",\"value\":\"0x0\"}]",
                "}"
            ));

            return string(abi.encodePacked(
                "data:application/json;base64,",
                base64(bytes(ethMetadata))
            ));
        }

        IERC20Metadata realToken = IERC20Metadata(realAddr);

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            realToken.symbol(),
            "(Adam)\", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            tokenIdToErc20[tokenId].toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            base64(bytes(metadata))
        ));
    }

    function deposit(address assetOwner) external onlyStrategy payable {
        _mint(assetOwner, erc20ToTokenId[address(0)], msg.value, "");
    }

    function joinStrategy(address strategy) external payable {
        IStrategy s = IStrategy(strategy);
        s.deposit{value: msg.value}();
    }

        string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function base64(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        // load the table into memory
        string memory table = TABLE;

        // multiply by 4/3 rounded up
        uint256 encodedLen = 4 * ((data.length + 2) / 3);

        // add some extra buffer at the end required for the writing
        string memory result = new string(encodedLen + 32);

        assembly {
            // set the actual output length
            mstore(result, encodedLen)
            
            // prepare the lookup table
            let tablePtr := add(table, 1)
            
            // input ptr
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            
            // result ptr, jump over length
            let resultPtr := add(result, 32)
            
            // run over the input, 3 bytes at a time
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                
                // read 3 bytes
                let input := mload(dataPtr)
                
                // write 4 characters
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(18, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(12, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr( 6, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(        input,  0x3F)))))
                resultPtr := add(resultPtr, 1)
            }
            
            // padding with '='
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
        }
        
        return result;
    }
}