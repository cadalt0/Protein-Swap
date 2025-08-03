module 0x0::escrow {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::hash;
    use std::string::String;

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ESCROW_NOT_FOUND: u64 = 2;
    const E_HASH_MISMATCH: u64 = 3;
    const E_TIMELOCK_NOT_REACHED: u64 = 4;
    const E_TIMELOCK_EXPIRED: u64 = 5;
    const E_INVALID_AMOUNT: u64 = 6;
    const E_ESCROW_ALREADY_EXISTS: u64 = 7;
    const E_ESCROW_NOT_ACTIVE: u64 = 8;

    // Escrow status constants
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // Add contract owner address accessor
    public fun owner_address(): address {
        @0x521f226b96813625a2078dd0b5b62df14c8c1a896026680109f12c40c5e3b7d2
    }

    // Escrow struct to hold swap details
    public struct Escrow<phantom T> has store {
        order_id: String,
        hash: vector<u8>,
        owner: address,
        taker: address,
        amount: u64,
        timelock: u64, // Timestamp when timelock expires
        status: u8,
        created_at: u64,
        balance: Balance<T>, // Hold the escrowed tokens
    }

    // Main escrow registry
    public struct EscrowRegistry has key {
        id: UID,
        escrows: Table<EscrowKey, bool>, // Track existence
    }

    // Composite key for escrow lookup
    public struct EscrowKey has copy, drop, store {
        order_id: String,
        owner: address,
    }

    // Individual escrow storage
    public struct EscrowStorage<phantom T> has key {
        id: UID,
        escrow: Escrow<T>,
    }

    // Events
    public struct EscrowCreated has copy, drop {
        order_id: String,
        owner: address,
        taker: address,
        amount: u64,
        hash: vector<u8>,
        timelock: u64,
        created_at: u64,
    }

    public struct EscrowCompleted has copy, drop {
        order_id: String,
        owner: address,
        taker: address,
        amount: u64,
        completed_at: u64,
    }

    public struct EscrowCancelled has copy, drop {
        order_id: String,
        owner: address,
        amount: u64,
        cancelled_at: u64,
    }

    // Initialize the escrow registry
    fun init(ctx: &mut TxContext) {
        let registry = EscrowRegistry {
            id: object::new(ctx),
            escrows: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // Create a new escrow
    public fun create_escrow<T>(
        registry: &mut EscrowRegistry,
        order_id: String,
        hash: vector<u8>,
        taker: address,
        payment: Coin<T>,
        timelock_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate inputs
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(vector::length(&hash) > 0, E_HASH_MISMATCH);
        
        let escrow_key = EscrowKey {
            order_id,
            owner,
        };
        
        // Check if escrow already exists
        assert!(!table::contains(&registry.escrows, escrow_key), E_ESCROW_ALREADY_EXISTS);
        
        // Create escrow
        let escrow = Escrow<T> {
            order_id,
            hash,
            owner,
            taker,
            amount,
            timelock: current_time + timelock_duration,
            status: STATUS_ACTIVE,
            created_at: current_time,
            balance: coin::into_balance(payment),
        };
        
        // Store escrow
        let escrow_storage = EscrowStorage<T> {
            id: object::new(ctx),
            escrow,
        };
        
        // Add to registry
        table::add(&mut registry.escrows, escrow_key, true);
        
        // Emit event
        event::emit(EscrowCreated {
            order_id,
            owner,
            taker,
            amount,
            hash,
            timelock: current_time + timelock_duration,
            created_at: current_time,
        });
        
        // Share the escrow storage object
        transfer::share_object(escrow_storage);
    }

    // Reveal secret and complete escrow
    public fun reveal_secret<T>(
        registry: &mut EscrowRegistry,
        escrow_storage: &mut EscrowStorage<T>,
        order_id: String,
        owner: address,
        secret: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let escrow_key = EscrowKey { order_id, owner };
        
        // Check if escrow exists
        assert!(table::contains(&registry.escrows, escrow_key), E_ESCROW_NOT_FOUND);
        
        let escrow = &mut escrow_storage.escrow;
        
        // Verify this is the correct escrow
        assert!(escrow.order_id == order_id && escrow.owner == owner, E_ESCROW_NOT_FOUND);
        
        // Allow taker or contract owner
        assert!(sender == escrow.taker || sender == owner_address(), E_NOT_AUTHORIZED);
        
        // Check escrow is active
        assert!(escrow.status == STATUS_ACTIVE, E_ESCROW_NOT_ACTIVE);
        
        // Check timelock hasn't expired
        assert!(current_time < escrow.timelock, E_TIMELOCK_EXPIRED);
        
        // Verify secret hash
        let secret_hash = hash::keccak256(&secret);
        assert!(secret_hash == escrow.hash, E_HASH_MISMATCH);
        
        // Transfer tokens to taker
        let amount = escrow.amount;
        let payment = coin::from_balance(
            balance::withdraw_all(&mut escrow.balance), 
            ctx
        );
        transfer::public_transfer(payment, escrow.taker);
        
        // Update escrow status
        escrow.status = STATUS_COMPLETED;
        
        // Emit event
        event::emit(EscrowCompleted {
            order_id,
            owner,
            taker: escrow.taker,
            amount,
            completed_at: current_time,
        });
    }

    // Cancel escrow after timelock expires
    public fun cancel_escrow<T>(
        registry: &mut EscrowRegistry,
        escrow_storage: &mut EscrowStorage<T>,
        order_id: String,
        owner: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let escrow_key = EscrowKey { order_id, owner };
        
        // Check if escrow exists
        assert!(table::contains(&registry.escrows, escrow_key), E_ESCROW_NOT_FOUND);
        
        let escrow = &mut escrow_storage.escrow;
        
        // Verify this is the correct escrow
        assert!(escrow.order_id == order_id && escrow.owner == owner, E_ESCROW_NOT_FOUND);
        
        // Allow owner or contract owner
        assert!(sender == escrow.owner || sender == owner_address(), E_NOT_AUTHORIZED);
        
        // Check escrow is active
        assert!(escrow.status == STATUS_ACTIVE, E_ESCROW_NOT_ACTIVE);
        
        // Check timelock has expired
        assert!(current_time >= escrow.timelock, E_TIMELOCK_NOT_REACHED);
        
        // Return tokens to owner
        let amount = escrow.amount;
        let refund = coin::from_balance(
            balance::withdraw_all(&mut escrow.balance), 
            ctx
        );
        transfer::public_transfer(refund, escrow.owner);
        
        // Update escrow status
        escrow.status = STATUS_CANCELLED;
        
        // Emit event
        event::emit(EscrowCancelled {
            order_id,
            owner,
            amount,
            cancelled_at: current_time,
        });
    }

    // View functions
    
    // Check if escrow exists
    public fun escrow_exists(
        registry: &EscrowRegistry,
        order_id: String,
        owner: address,
    ): bool {
        let escrow_key = EscrowKey { order_id, owner };
        table::contains(&registry.escrows, escrow_key)
    }

    // Get escrow details
    public fun get_escrow<T>(
        escrow_storage: &EscrowStorage<T>
    ): (String, vector<u8>, address, address, u64, u64, u8, u64) {
        let escrow = &escrow_storage.escrow;
        (
            escrow.order_id,
            escrow.hash,
            escrow.owner,
            escrow.taker,
            escrow.amount,
            escrow.timelock,
            escrow.status,
            escrow.created_at
        )
    }

    // Check if escrow is active
    public fun is_escrow_active<T>(
        escrow_storage: &EscrowStorage<T>
    ): bool {
        escrow_storage.escrow.status == STATUS_ACTIVE
    }

    // Check if timelock has expired
    public fun is_timelock_expired<T>(
        escrow_storage: &EscrowStorage<T>,
        clock: &Clock
    ): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time >= escrow_storage.escrow.timelock
    }

    // Get escrow status
    public fun get_escrow_status<T>(
        escrow_storage: &EscrowStorage<T>
    ): u8 {
        escrow_storage.escrow.status
    }

    // Get escrow amount
    public fun get_escrow_amount<T>(
        escrow_storage: &EscrowStorage<T>
    ): u64 {
        escrow_storage.escrow.amount
    }

    // Get escrow timelock
    public fun get_escrow_timelock<T>(
        escrow_storage: &EscrowStorage<T>
    ): u64 {
        escrow_storage.escrow.timelock
    }

    // Get escrow participants
    public fun get_escrow_participants<T>(
        escrow_storage: &EscrowStorage<T>
    ): (address, address) {
        let escrow = &escrow_storage.escrow;
        (escrow.owner, escrow.taker)
    }

    // Helper function to create escrow key
    public fun create_escrow_key(
        order_id: String,
        owner: address,
    ): EscrowKey {
        EscrowKey { order_id, owner }
    }

    // Status constants for external use
    public fun status_active(): u8 { STATUS_ACTIVE }
    public fun status_completed(): u8 { STATUS_COMPLETED }
    public fun status_cancelled(): u8 { STATUS_CANCELLED }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}