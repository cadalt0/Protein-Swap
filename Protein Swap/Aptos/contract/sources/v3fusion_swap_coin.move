module fusion_swap_addr::fusion_swap_v3_coin {
    use std::signer;
    use std::hash;
    use std::string::String;
    use std::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event;
    use aptos_framework::table;

    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EESCROW_NOT_FOUND: u64 = 2;
    const EHASH_MISMATCH: u64 = 3;
    const ETIMELOCK_NOT_EXPIRED: u64 = 4;
    const ETIMELOCK_EXPIRED: u64 = 5;
    const EINVALID_AMOUNT: u64 = 6;
    const EESCROW_ALREADY_EXISTS: u64 = 7;

    // Escrow status
    const STATUS_ACTIVE: u64 = 0;
    const STATUS_COMPLETED: u64 = 1;
    const STATUS_CANCELLED: u64 = 2;

    // Generic escrow structure with phantom type parameter
    struct Escrow<phantom CoinType> has key, store {
        order_id: String,
        hash: vector<u8>,
        owner: address,
        taker: address,
        token_address: address,
        amount: u64,
        timelock: u64,
        status: u64,
        created_at: u64,
        coins: Coin<CoinType>,
    }

    struct EscrowKey has copy, drop, store {
        order_id: String,
        owner: address,
    }

    struct EscrowTable<phantom CoinType> has key {
        table: table::Table<EscrowKey, Escrow<CoinType>>,
    }

    #[event]
    struct EscrowCreatedEvent has drop, store {
        order_id: String,
        owner: address,
        taker: address,
        token_address: address,
        amount: u64,
        timelock: u64,
    }

    #[event]
    struct EscrowCompletedEvent has drop, store {
        order_id: String,
        taker: address,
        amount: u64,
    }

    #[event]
    struct EscrowCancelledEvent has drop, store {
        order_id: String,
        owner: address,
        amount: u64,
    }

    fun init_module(_sender: &signer) {
        // This will be initialized per coin type when first used
    }

    // ======================== Write Functions ========================

    /// Create a new escrow for atomic swap with any coin type
    public entry fun create_escrow<CoinType>(
        sender: &signer,
        order_id: String,
        hash: vector<u8>,
        taker: address,
        token_address: address,
        amount: u64,
        timelock_duration: u64,
    ) acquires EscrowTable {
        let owner = signer::address_of(sender);
        if (!exists<EscrowTable<CoinType>>(owner)) {
            move_to(sender, EscrowTable<CoinType> { table: table::new<EscrowKey, Escrow<CoinType>>() });
        };
        let key = EscrowKey { order_id, owner };
        assert!(amount > 0, EINVALID_AMOUNT);
        assert!(timelock_duration > 0, EINVALID_AMOUNT);
        let escrows = &mut borrow_global_mut<EscrowTable<CoinType>>(owner).table;
        assert!(!table::contains(escrows, key), EESCROW_ALREADY_EXISTS);

        let current_time = timestamp::now_seconds();
        let timelock = current_time + timelock_duration;

        // Withdraw coins from sender
        let coins = coin::withdraw<CoinType>(sender, amount);

        let escrow = Escrow<CoinType> {
            order_id: key.order_id,
            hash,
            owner,
            taker,
            token_address,
            amount,
            timelock,
            status: STATUS_ACTIVE,
            created_at: current_time,
            coins,
        };

        event::emit(EscrowCreatedEvent {
            order_id: key.order_id,
            owner,
            taker,
            token_address,
            amount,
            timelock,
        });

        table::add(escrows, key, escrow);
    }

    /// Reveal secret to complete the atomic swap
    public entry fun reveal_secret<CoinType>(
        sender: &signer,
        order_id: String,
        owner: address,
        secret: vector<u8>,
    ) acquires EscrowTable {
        let caller = signer::address_of(sender);
        let contract_owner = get_escrow_owner();
        let key = EscrowKey { order_id, owner };
        let escrows = &mut borrow_global_mut<EscrowTable<CoinType>>(owner).table;
        assert!(table::contains(escrows, key), EESCROW_NOT_FOUND);
        let escrow = table::borrow_mut(escrows, key);
        assert!(escrow.status == STATUS_ACTIVE, EESCROW_NOT_FOUND);
        assert!(escrow.taker == caller || contract_owner == caller, ENOT_AUTHORIZED);
        let current_time = timestamp::now_seconds();
        assert!(current_time < escrow.timelock, ETIMELOCK_EXPIRED);
        let computed_hash = hash::sha3_256(secret);
        assert!(computed_hash == escrow.hash, EHASH_MISMATCH);
        escrow.status = STATUS_COMPLETED;
        
        // Transfer coins to taker
        let coins = &mut escrow.coins;
        let amount = coin::value(coins);
        let transfer_coins = coin::extract(coins, amount);
        coin::deposit<CoinType>(escrow.taker, transfer_coins);
        
        event::emit(EscrowCompletedEvent {
            order_id: escrow.order_id,
            taker: escrow.taker,
            amount: escrow.amount,
        });
    }

    /// Cancel escrow and return funds to owner after timelock expires
    public entry fun cancel_escrow<CoinType>(
        sender: &signer,
        order_id: String,
        owner: address,
    ) acquires EscrowTable {
        let caller = signer::address_of(sender);
        let contract_owner = get_escrow_owner();
        let key = EscrowKey { order_id, owner };
        let escrows = &mut borrow_global_mut<EscrowTable<CoinType>>(owner).table;
        assert!(table::contains(escrows, key), EESCROW_NOT_FOUND);
        let escrow = table::borrow_mut(escrows, key);
        assert!(escrow.status == STATUS_ACTIVE, EESCROW_NOT_FOUND);
        assert!(escrow.owner == caller || contract_owner == caller, ENOT_AUTHORIZED);
        let current_time = timestamp::now_seconds();
        assert!(current_time >= escrow.timelock, ETIMELOCK_NOT_EXPIRED);
        escrow.status = STATUS_CANCELLED;
        
        // Return coins to owner
        let coins = &mut escrow.coins;
        let amount = coin::value(coins);
        let transfer_coins = coin::extract(coins, amount);
        coin::deposit<CoinType>(escrow.owner, transfer_coins);
        
        event::emit(EscrowCancelledEvent {
            order_id: escrow.order_id,
            owner: escrow.owner,
            amount: escrow.amount,
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun escrow_exists<CoinType>(order_id: String, owner: address): bool acquires EscrowTable {
        let key = EscrowKey { order_id, owner };
        if (!exists<EscrowTable<CoinType>>(owner)) {
            return false
        };
        let escrows = &borrow_global<EscrowTable<CoinType>>(key.owner).table;
        table::contains(escrows, key)
    }

    #[view]
    public fun get_escrow<CoinType>(order_id: String, owner: address): (
        String,
        vector<u8>,
        address,
        address,
        address,
        u64,
        u64,
        u64,
        u64
    ) acquires EscrowTable {
        let key = EscrowKey { order_id, owner };
        let escrows = &borrow_global<EscrowTable<CoinType>>(key.owner).table;
        let escrow = table::borrow(escrows, key);
        (
            escrow.order_id,
            escrow.hash,
            escrow.owner,
            escrow.taker,
            escrow.token_address,
            escrow.amount,
            escrow.timelock,
            escrow.status,
            escrow.created_at
        )
    }

    #[view]
    public fun is_escrow_active<CoinType>(order_id: String, owner: address): bool acquires EscrowTable {
        let key = EscrowKey { order_id, owner };
        if (!escrow_exists<CoinType>(key.order_id, key.owner)) {
            return false
        };
        let escrows = &borrow_global<EscrowTable<CoinType>>(key.owner).table;
        let escrow = table::borrow(escrows, key);
        escrow.status == STATUS_ACTIVE
    }

    #[view]
    public fun is_timelock_expired<CoinType>(order_id: String, owner: address): bool acquires EscrowTable {
        let key = EscrowKey { order_id, owner };
        if (!escrow_exists<CoinType>(key.order_id, key.owner)) {
            return false
        };
        let escrows = &borrow_global<EscrowTable<CoinType>>(key.owner).table;
        let escrow = table::borrow(escrows, key);
        timestamp::now_seconds() >= escrow.timelock
    }

    // ======================== Helper Functions ========================

    fun get_escrow_owner(): address {
        @fusion_swap_addr
    }

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }
}