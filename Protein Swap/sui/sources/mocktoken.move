module 0x0::unite_v1 {
    use sui::coin::{Self, TreasuryCap};

    /// The struct representing the Unite v1 token type
    public struct UNITE_V1 has drop {}

    /// Store the treasury cap globally so anyone can mint
    public struct Treasury has key {
        id: sui::object::UID,
        cap: TreasuryCap<UNITE_V1>,
    }

    /// Initialize the Unite v1 token. Should be called once by the deployer with a one-time witness.
    fun init(witness: UNITE_V1, ctx: &mut sui::tx_context::TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, // decimals
            b"UNITE", // symbol
            b"Unite v1", // name
            b"", // description
            option::none(), // icon url
            ctx,
        );
        sui::transfer::public_freeze_object(metadata);
        
        // Make the treasury cap publicly accessible so anyone can mint
        let treasury = Treasury {
            id: sui::object::new(ctx),
            cap: treasury_cap,
        };
        sui::transfer::share_object(treasury);
    }

    /// Public mint function that allows anyone to mint tokens to themselves.
    public fun public_mint(
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut sui::tx_context::TxContext,
    ): coin::Coin<UNITE_V1> {
        coin::mint(&mut treasury.cap, amount, ctx)
    }

    /// Public mint function that allows anyone to mint tokens to a specific recipient.
    public fun public_mint_to(
        treasury: &mut Treasury,
        amount: u64,
        recipient: address,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let coin = coin::mint(&mut treasury.cap, amount, ctx);
        sui::transfer::public_transfer(coin, recipient);
    }
}
