// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Base64.sol";
import "./Portfolio.sol";
import "./ToString.sol";


interface IAssetManager {
    function deposit(address portfolio) payable external;
}

contract Strategy is ERC721 {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;

    address[] public portfolioList;
    address payable public assetManager;
    Counters.Counter private _tokenIds;
    mapping(uint => Portfolio) public tokenIdToPortfolio;

    constructor() ERC721("Portfolio", "PFLO") {
        assetManager = payable(msg.sender);
    }

    function deposit() external payable {
        _tokenIds.increment();
        uint256 newId = _tokenIds.current();

        tokenIdToPortfolio[newId] = new Portfolio(msg.sender, address(this));
        portfolioList.push(address(tokenIdToPortfolio[newId]));
        _safeMint(msg.sender, newId);

        IAssetManager(assetManager).deposit{value: msg.value}(address(tokenIdToPortfolio[newId]));
    }

    function getLastTokenId() public view returns (uint) {
        return _tokenIds.current();
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"Adam Portfolio #",
            tokenId.toString(),
            "\", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            address(tokenIdToPortfolio[tokenId]).toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            base64(bytes(metadata))
        ));
    }

    /** BASE 64 - Written by Brech Devos */

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
