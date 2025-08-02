module fusion_swap_addr::A3mock_token {
    use std::signer;
    use std::string;
    use aptos_framework::coin;

    /// Simple mock FA token for testing
    struct MockToken has key {}

    /// Initialize the MockToken coin.
    fun init_module(account: &signer) {
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<MockToken>(
            account,
            string::utf8(b"UNITE v3"),
            string::utf8(b"UNITE"),
            8,
            false,
        );

        // Store capabilities in the account
        move_to(account, MintCap { mint_cap });
        move_to(account, BurnCap { burn_cap });
        move_to(account, FreezeCap { freeze_cap });
    }

    /// Capability that allows the holder to mint coins.
    struct MintCap has key {
        mint_cap: coin::MintCapability<MockToken>,
    }

    /// Capability that allows the holder to burn coins.
    struct BurnCap has key {
        burn_cap: coin::BurnCapability<MockToken>,
    }

    /// Capability that allows the holder to freeze coins.
    struct FreezeCap has key {
        freeze_cap: coin::FreezeCapability<MockToken>,
    }

    /// Mint coins to the given account - anyone can mint for testing
    public entry fun mint(account: &signer, amount: u64) acquires MintCap {
        // Use the contract deployer's mint capability (stored at module address)
        let mint_cap = &borrow_global<MintCap>(@fusion_swap_addr).mint_cap;
        let coins = coin::mint<MockToken>(amount, mint_cap);
        coin::deposit(signer::address_of(account), coins);
    }

    /// Burn coins from the given account.
    public entry fun burn(account: &signer, amount: u64) acquires BurnCap {
        let burn_cap = &borrow_global<BurnCap>(signer::address_of(account)).burn_cap;
        let coins = coin::withdraw<MockToken>(account, amount);
        coin::burn(coins, burn_cap);
    }

    /// Get the balance of MockToken for the given account.
    public fun balance_of(account_addr: address): u64 {
        coin::balance<MockToken>(account_addr)
    }

    #[test_only]
    public fun initialize_for_test(account: &signer) {
        // Always initialize for tests - don't check if already registered
        // since the coin might not be initialized yet
        init_module(account);
    }
} 