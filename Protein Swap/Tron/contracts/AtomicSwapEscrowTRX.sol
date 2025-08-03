// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

contract AtomicSwapEscrowTRX {
    enum Status { NONE, ACTIVE, COMPLETED, CANCELLED }

    struct Escrow {
        string orderId;
        bytes32 hash;
        address owner;
        address taker;
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

    function createEscrowTRX(
        string memory orderId,
        bytes32 hash,
        address taker,
        uint256 timelockDuration
    ) external payable {
        require(msg.value > 0, "Invalid (zero) amount");
        bytes32 key = _escrowKey(orderId, msg.sender);
        require(escrows[key].status == Status.NONE, "Escrow already exists");
        require(taker != address(0), "Invalid taker address");
        require(hash != bytes32(0), "Invalid hash");
        require(timelockDuration > 0, "Invalid timelock");

        escrows[key] = Escrow({
            orderId: orderId,
            hash: hash,
            owner: msg.sender,
            taker: taker,
            amount: msg.value,
            timelock: block.timestamp + timelockDuration,
            status: Status.ACTIVE,
            createdAt: block.timestamp
        });

        emit EscrowCreated(orderId, msg.sender, taker, msg.value, block.timestamp + timelockDuration);
    }

    function revealSecretTRX(
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
        
        // Transfer TRX to taker
        (bool success, ) = esc.taker.call{value: esc.amount}("");
        require(success, "TRX transfer to taker failed");
        
        emit EscrowCompleted(orderId, esc.taker, esc.amount);
    }

    function cancelEscrowTRX(string memory orderId, address owner) external {
        bytes32 key = _escrowKey(orderId, owner);
        Escrow storage esc = escrows[key];
        require(esc.status == Status.ACTIVE, "Escrow not active");
        require(
            msg.sender == esc.owner || msg.sender == contractOwner,
            "Not authorized"
        );
        require(block.timestamp >= esc.timelock, "Timelock not expired");

        esc.status = Status.CANCELLED;
        
        // Return TRX to owner
        (bool success, ) = esc.owner.call{value: esc.amount}("");
        require(success, "TRX return to owner failed");
        
        emit EscrowCancelled(orderId, esc.owner, esc.amount);
    }

    // Emergency function to withdraw stuck TRX (only contract owner)
    function emergencyWithdrawTRX() external onlyContractOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No TRX to withdraw");
        
        (bool success, ) = contractOwner.call{value: balance}("");
        require(success, "Emergency TRX withdrawal failed");
    }

    // View/Getters
    function escrowExists(string memory orderId, address owner) public view returns (bool) {
        bytes32 key = _escrowKey(orderId, owner);
        return escrows[key].status != Status.NONE;
    }

    function getEscrowTRX(string memory orderId, address owner) public view returns (
        string memory,
        bytes32,
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

    // Get contract TRX balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Receive function to accept TRX (fallback)
    receive() external payable {
        // This allows the contract to receive TRX
    }
} 