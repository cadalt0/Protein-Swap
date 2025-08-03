// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

contract AtomicSwapEscrow {
    enum Status { NONE, ACTIVE, COMPLETED, CANCELLED }

    struct Escrow {
        string orderId;
        bytes32 hash;
        address owner;
        address taker;
        address tokenAddress;
        uint256 amount;
        uint256 timelock;
        Status status;
        uint256 createdAt;
    }

    address public contractOwner;
    mapping(bytes32 => Escrow) private escrows;

    event EscrowCreated(
        string orderId,
        address indexed owner,
        address indexed taker,
        address indexed tokenAddress,
        uint256 amount,
        uint256 timelock
    );
    event EscrowCompleted(string orderId, address indexed taker, uint256 amount);
    event EscrowCancelled(string orderId, address indexed owner, uint256 amount);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    function _escrowKey(string memory orderId, address owner) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(orderId, owner));
    }

    function createEscrow(
        string memory orderId,
        bytes32 hash,
        address taker,
        address tokenAddress,
        uint256 amount,
        uint256 timelockDuration
    ) external {
        require(amount > 0, "Invalid (zero) amount");
        bytes32 key = _escrowKey(orderId, msg.sender);
        require(escrows[key].status == Status.NONE, "Escrow already exists");
        require(tokenAddress != address(0), "Invalid token address");
        require(taker != address(0), "Invalid taker address");
        require(hash != bytes32(0), "Invalid hash");
        require(timelockDuration > 0, "Invalid timelock");

        // Transfer tokens from sender to contract
        require(
            ITRC20(tokenAddress).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        escrows[key] = Escrow({
            orderId: orderId,
            hash: hash,
            owner: msg.sender,
            taker: taker,
            tokenAddress: tokenAddress,
            amount: amount,
            timelock: block.timestamp + timelockDuration,
            status: Status.ACTIVE,
            createdAt: block.timestamp
        });

        emit EscrowCreated(orderId, msg.sender, taker, tokenAddress, amount, block.timestamp + timelockDuration);
    }

    function revealSecret(
        string memory orderId,
        address owner,
        bytes memory secret
    ) external {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        require(esc.status == Status.ACTIVE, "Escrow not active");
        require(msg.sender == esc.taker || msg.sender == contractOwner, "Not authorized");
        require(block.timestamp < esc.timelock, "Timelock expired");
        require(keccak256(secret) == esc.hash, "Hash mismatch");

        esc.status = Status.COMPLETED;
        require(
            ITRC20(esc.tokenAddress).transfer(esc.taker, esc.amount),
            "Token transfer to taker failed"
        );
        emit EscrowCompleted(orderId, esc.taker, esc.amount);
    }

    function cancelEscrow(string memory orderId, address owner) external {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        require(esc.status == Status.ACTIVE, "Escrow not active");
        require(
            msg.sender == esc.owner || msg.sender == contractOwner,
            "Not authorized"
        );
        require(block.timestamp >= esc.timelock, "Timelock not expired");

        esc.status = Status.CANCELLED;
        require(
            ITRC20(esc.tokenAddress).transfer(esc.owner, esc.amount),
            "Token return to owner failed"
        );
        emit EscrowCancelled(orderId, esc.owner, esc.amount);
    }

    // View/Getters
    function escrowExists(string memory orderId, address owner) public view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        return escrows[key].status != Status.NONE;
    }

    function getEscrow(string memory orderId, address owner) public view returns (
        string memory,
        bytes32,
        address,
        address,
        address,
        uint256,
        uint256,
        Status,
        uint256
    ) {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        require(esc.status != Status.NONE, "Escrow not found");
        return (
            esc.orderId,
            esc.hash,
            esc.owner,
            esc.taker,
            esc.tokenAddress,
            esc.amount,
            esc.timelock,
            esc.status,
            esc.createdAt
        );
    }

    function isEscrowActive(string memory orderId, address owner) public view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        return escrows[key].status == Status.ACTIVE;
    }

    function isTimelockExpired(string memory orderId, address owner) public view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        require(esc.status != Status.NONE, "Escrow not found");
        return block.timestamp >= esc.timelock;
    }
} 