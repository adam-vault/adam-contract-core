// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;


contract MockFeedRegistry {

  // int256 private _price;
  mapping(address => mapping(address => int256)) private _price;
  mapping(address => mapping(address => address)) private _aggregator;
  // mapping(address => bool) private _feed;

  function setPrice(address base, address quote, int256 price) public {
      _price[base][quote] = price;
  }

  function setAggregator(address base, address quote, address aggregator) public {
      _aggregator[base][quote] = aggregator;
  }

  // function setFeed(address asset, bool supported) public {
  //     _feed[asset] = supported;
  // }
  

  function latestRoundData(address base, address quote)
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return (18446744073709580067, _price[base][quote], 1649757960, 1649757960, 18446744073709580067);
    }

  function getFeed(address base, address quote) external view returns (address aggregator) {
      require(_aggregator[base][quote] != address(0), "Feed not supported");
      return _aggregator[base][quote];
  }
}