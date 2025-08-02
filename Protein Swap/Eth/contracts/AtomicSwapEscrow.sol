// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AtomicSwapEscrow {
    // Status constants
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_COMPLETED = 2;
    uint8 public constant STATUS_CANCELLED = 3;

    // Escrow struct
    struct Escrow {
        string orderId;
        bytes32 hash;
        address owner;
        address taker;
        address token;
        uint256 amount;
        uint256 timelock;
        uint8 status;
        uint256 createdAt;
        uint256 balance;
    }

    // Mapping: keccak256(orderId, owner) => Escrow
    mapping(bytes32 => Escrow) private escrows;

    // Owner of the contract
    address public contractOwner;

    // Events
    event EscrowCreated(string orderId, address indexed owner, address indexed taker, address token, uint256 amount, uint256 timelock);
    event EscrowCompleted(string orderId, address indexed owner, address indexed taker, address token, uint256 amount, bytes secret);
    event EscrowCancelled(string orderId, address indexed owner, address token, uint256 amount);

    // Custom errors
    error NotAuthorized();
    error EscrowNotFound();
    error HashMismatch();
    error TimelockNotExpired();
    error TimelockNotActive();
    error InvalidAmount();
    error EscrowAlreadyExists();
    error EscrowNotActive();

    constructor() {
        contractOwner = msg.sender;
    }

    // Internal: get escrow key
    function _escrowKey(string memory orderId, address owner) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(orderId, owner));
    }

    // Create a new escrow
    function createEscrow(
        string memory orderId,
        address owner,
        bytes32 hash,
        address taker,
        address token,
        uint256 amount,
        uint256 timelockDuration
    ) external {
        if (amount == 0) revert InvalidAmount();
        bytes32 key = _escrowKey(orderId, owner);
        if (escrows[key].status == STATUS_ACTIVE) revert EscrowAlreadyExists();

        uint256 timelock = block.timestamp + timelockDuration;
        // Transfer tokens from owner to contract
        bool success = IERC20(token).transferFrom(owner, address(this), amount);
        require(success, "Token transfer failed");

        escrows[key] = Escrow({
            orderId: orderId,
            hash: hash,
            owner: owner,
            taker: taker,
            token: token,
            amount: amount,
            timelock: timelock,
            status: STATUS_ACTIVE,
            createdAt: block.timestamp,
            balance: amount
        });

        emit EscrowCreated(orderId, owner, taker, token, amount, timelock);
    }

    // Reveal secret and complete escrow
    function revealSecret(string memory orderId, address owner, bytes memory secret) external {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        if (esc.status != STATUS_ACTIVE) revert EscrowNotActive();
        if (esc.owner == address(0)) revert EscrowNotFound();
        if (msg.sender != esc.taker && msg.sender != contractOwner) revert NotAuthorized();
        if (block.timestamp > esc.timelock) revert TimelockNotActive();
        if (keccak256(secret) != esc.hash) revert HashMismatch();

        uint256 amount = esc.amount;
        esc.status = STATUS_COMPLETED;
        esc.balance = 0;
        // Transfer tokens to taker
        bool success = IERC20(esc.token).transfer(esc.taker, amount);
        require(success, "Token transfer failed");

        emit EscrowCompleted(orderId, owner, esc.taker, esc.token, amount, secret);
    }

    // Cancel escrow after timelock expiry
    function cancelEscrow(string memory orderId, address owner) external {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        if (esc.status != STATUS_ACTIVE) revert EscrowNotActive();
        if (esc.owner == address(0)) revert EscrowNotFound();
        if (msg.sender != esc.owner && msg.sender != contractOwner) revert NotAuthorized();
        if (block.timestamp <= esc.timelock) revert TimelockNotExpired();

        uint256 amount = esc.amount;
        esc.status = STATUS_CANCELLED;
        esc.balance = 0;
        // Return tokens to owner
        bool success = IERC20(esc.token).transfer(esc.owner, amount);
        require(success, "Token transfer failed");

        emit EscrowCancelled(orderId, owner, esc.token, amount);
    }

    // View: check if escrow exists
    function escrowExists(string memory orderId, address owner) external view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        return escrows[key].owner != address(0);
    }

    // View: get escrow details
    function getEscrow(string memory orderId, address owner) external view returns (
        string memory,
        bytes32,
        address,
        address,
        address,
        uint256,
        uint256,
        uint8,
        uint256,
        uint256
    ) {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        if (esc.owner == address(0)) revert EscrowNotFound();
        return (
            esc.orderId,
            esc.hash,
            esc.owner,
            esc.taker,
            esc.token,
            esc.amount,
            esc.timelock,
            esc.status,
            esc.createdAt,
            esc.balance
        );
    }

    // View: is escrow active
    function isEscrowActive(string memory orderId, address owner) external view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        return escrows[key].status == STATUS_ACTIVE;
    }

    // View: is timelock expired
    function isTimelockExpired(string memory orderId, address owner) external view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        if (esc.owner == address(0)) revert EscrowNotFound();
        return block.timestamp > esc.timelock;
    }
} 