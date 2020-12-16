// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;


contract AggUsdtEth {
  function decimals() external pure returns (uint8) {
    return 18;
  }

  function latestAnswer() external pure returns (int256) {
    return 2089740481186284;
  }

  function latestTimestamp() external view returns (uint256) {
    return block.timestamp;
  }

}