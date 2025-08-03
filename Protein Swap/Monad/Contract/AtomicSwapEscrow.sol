// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract AtomicSwapEscrow {
    enum Status { ACTIVE, COMPLETED, CANCELLED }

    struct Escrow {
        bytes32 orderId;
        bytes32 hash;
        address owner;
        address taker;
        address tokenAddress; // address(0) for native MONAD
        uint256 amount;
        uint64 timelock;
        Status status;
        uint64 createdAt;
    }

    // mapping: orderId => owner => Escrow
    mapping(bytes32 => mapping(address => Escrow)) public escrows;

    address public admin;

    event EscrowCreated(bytes32 indexed orderId, address indexed owner, address indexed taker, address tokenAddress, uint256 amount, uint64 timelock);
    event EscrowCompleted(bytes32 indexed orderId, address indexed owner, address indexed taker, bytes secret);
    event EscrowCancelled(bytes32 indexed orderId, address indexed owner);

    error NotAuthorized();
    error EscrowNotFound();
    error HashMismatch();
    error TimelockNotExpired();
    error TimelockNotSetOrExpired();
    error InvalidAmount();
    error EscrowAlreadyExists();
    error EscrowNotActive();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createEscrow(
        bytes32 orderId,
        bytes32 hash,
        address taker,
        address tokenAddress,
        uint256 amount,
        uint64 timelockDuration
    ) external payable {
        if (amount == 0) revert InvalidAmount();
        if (escrows[orderId][msg.sender].orderId != 0) revert EscrowAlreadyExists();
        uint64 createdAt = uint64(block.timestamp);
        uint64 timelock = createdAt + timelockDuration;

        if (tokenAddress == address(0)) {
            // Native MONAD
            if (msg.value != amount) revert InvalidAmount();
        } else {
            // ERC20
            if (msg.value != 0) revert InvalidAmount();
            bool success = IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
            require(success, "ERC20 transfer failed");
        }

        Escrow memory escrow = Escrow({
            orderId: orderId,
            hash: hash,
            owner: msg.sender,
            taker: taker,
            tokenAddress: tokenAddress,
            amount: amount,
            timelock: timelock,
            status: Status.ACTIVE,
            createdAt: createdAt
        });
        escrows[orderId][msg.sender] = escrow;
        emit EscrowCreated(orderId, msg.sender, taker, tokenAddress, amount, timelock);
    }

    function revealSecret(bytes32 orderId, address owner, bytes calldata secret) external {
        Escrow storage escrow = escrows[orderId][owner];
        if (escrow.orderId == 0) revert EscrowNotFound();
        if (escrow.status != Status.ACTIVE) revert EscrowNotActive();
        if (msg.sender != escrow.taker && msg.sender != admin) revert NotAuthorized();
        if (block.timestamp > escrow.timelock) revert TimelockNotSetOrExpired();
        if (keccak256(secret) != escrow.hash) revert HashMismatch();

        escrow.status = Status.COMPLETED;
        if (escrow.tokenAddress == address(0)) {
            // Native MONAD
            (bool sent, ) = escrow.taker.call{value: escrow.amount}("");
            require(sent, "Native transfer failed");
        } else {
            // ERC20
            bool success = IERC20(escrow.tokenAddress).transfer(escrow.taker, escrow.amount);
            require(success, "ERC20 transfer failed");
        }
        emit EscrowCompleted(orderId, owner, escrow.taker, secret);
    }

    function cancelEscrow(bytes32 orderId, address owner) external {
        Escrow storage escrow = escrows[orderId][owner];
        if (escrow.orderId == 0) revert EscrowNotFound();
        if (escrow.status != Status.ACTIVE) revert EscrowNotActive();
        if (block.timestamp <= escrow.timelock) revert TimelockNotExpired();
        if (msg.sender != escrow.owner && msg.sender != admin) revert NotAuthorized();

        escrow.status = Status.CANCELLED;
        if (escrow.tokenAddress == address(0)) {
            // Native MONAD
            (bool sent, ) = escrow.owner.call{value: escrow.amount}("");
            require(sent, "Native refund failed");
        } else {
            // ERC20
            bool success = IERC20(escrow.tokenAddress).transfer(escrow.owner, escrow.amount);
            require(success, "ERC20 refund failed");
        }
        emit EscrowCancelled(orderId, owner);
    }

    // --- View/Utility Methods ---
    function escrowExists(bytes32 orderId, address owner) public view returns (bool) {
        return escrows[orderId][owner].orderId != 0;
    }

    function getEscrow(bytes32 orderId, address owner) external view returns (Escrow memory) {
        Escrow memory escrow = escrows[orderId][owner];
        if (escrow.orderId == 0) revert EscrowNotFound();
        return escrow;
    }

    function isEscrowActive(bytes32 orderId, address owner) external view returns (bool) {
        Escrow memory escrow = escrows[orderId][owner];
        if (escrow.orderId == 0) return false;
        return escrow.status == Status.ACTIVE;
    }

    function isTimelockExpired(bytes32 orderId, address owner) external view returns (bool) {
        Escrow memory escrow = escrows[orderId][owner];
        if (escrow.orderId == 0) return false;
        return block.timestamp > escrow.timelock;
    }
}