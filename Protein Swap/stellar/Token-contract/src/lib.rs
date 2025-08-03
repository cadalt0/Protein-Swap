#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Map, Symbol, String,
};

const ADMIN: Symbol = symbol_short!("admin");
const BALANCES: Symbol = symbol_short!("balances");
const NAME: Symbol = symbol_short!("name");
const SYMBOL: Symbol = symbol_short!("symbol");
const DECIMALS: Symbol = symbol_short!("decimals");

#[contract]
pub struct UniteV2Token;

#[contractimpl]
impl UniteV2Token {
    // Initialize the token
    pub fn init(e: Env, admin: Address) {
        e.storage().instance().set(&ADMIN, &admin);
        e.storage().instance().set(&NAME, &"UNITE V2");
        e.storage().instance().set(&SYMBOL, &"UNITEV2");
        e.storage().instance().set(&DECIMALS, &7u32);
        
        // Extend TTL
        e.storage().instance().extend_ttl(518400, 518400);
    }

    // Mint tokens (anyone can mint)
    pub fn mint(e: Env, to: Address, amount: i128) {
        // Validate amount
        if amount <= 0 {
            panic!("amount must be positive");
        }
        
        // Get current balance
        let mut balances: Map<Address, i128> = e.storage().instance().get(&BALANCES).unwrap_or(Map::new(&e));
        let current_balance = balances.get(to.clone()).unwrap_or(0);
        
        // Update balance
        balances.set(to.clone(), current_balance + amount);
        e.storage().instance().set(&BALANCES, &balances);
        
        // Extend TTL
        e.storage().instance().extend_ttl(518400, 518400);
    }

    // Transfer tokens
    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        // Require auth from sender
        from.require_auth();
        
        // Validate amount
        if amount <= 0 {
            panic!("amount must be positive");
        }
        
        // Get balances
        let mut balances: Map<Address, i128> = e.storage().instance().get(&BALANCES).unwrap_or(Map::new(&e));
        
        // Check sender balance
        let from_balance = balances.get(from.clone()).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        
        // Update balances
        balances.set(from.clone(), from_balance - amount);
        let to_balance = balances.get(to.clone()).unwrap_or(0);
        balances.set(to.clone(), to_balance + amount);
        
        // Save balances
        e.storage().instance().set(&BALANCES, &balances);
        
        // Extend TTL
        e.storage().instance().extend_ttl(518400, 518400);
    }

    // Get balance
    pub fn balance(e: Env, address: Address) -> i128 {
        let balances: Map<Address, i128> = e.storage().instance().get(&BALANCES).unwrap_or(Map::new(&e));
        balances.get(address).unwrap_or(0)
    }

    // Get token name
    pub fn name(e: Env) -> String {
        e.storage().instance().get(&NAME).unwrap()
    }

    // Get token symbol
    pub fn symbol(e: Env) -> String {
        e.storage().instance().get(&SYMBOL).unwrap()
    }

    // Get token decimals
    pub fn decimals(e: Env) -> u32 {
        e.storage().instance().get(&DECIMALS).unwrap()
    }

    // Get admin
    pub fn admin(e: Env) -> Address {
        e.storage().instance().get(&ADMIN).unwrap()
    }

    // Burn tokens
    pub fn burn(e: Env, from: Address, amount: i128) {
        // Require auth from sender
        from.require_auth();
        
        // Validate amount
        if amount <= 0 {
            panic!("amount must be positive");
        }
        
        // Get balances
        let mut balances: Map<Address, i128> = e.storage().instance().get(&BALANCES).unwrap_or(Map::new(&e));
        
        // Check sender balance
        let from_balance = balances.get(from.clone()).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        
        // Update balance
        balances.set(from.clone(), from_balance - amount);
        
        // Save balances
        e.storage().instance().set(&BALANCES, &balances);
        
        // Extend TTL
        e.storage().instance().extend_ttl(518400, 518400);
    }

    // Set new admin
    pub fn set_admin(e: Env, new_admin: Address) {
        // Check current admin
        let admin: Address = e.storage().instance().get(&ADMIN).unwrap();
        admin.require_auth();
        
        // Set new admin
        e.storage().instance().set(&ADMIN, &new_admin);
        
        // Extend TTL
        e.storage().instance().extend_ttl(518400, 518400);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn test_init() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let contract_id = e.register_contract(None, UniteV2Token);
        let client = UniteV2TokenClient::new(&e, &contract_id);
        
        client.init(&admin);
        
        assert_eq!(client.name(), String::from_str(&e, "UNITE V2"));
        assert_eq!(client.symbol(), String::from_str(&e, "UNITEV2"));
        assert_eq!(client.decimals(), 7);
        assert_eq!(client.admin(), admin);
    }

    #[test]
    fn test_mint() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let contract_id = e.register_contract(None, UniteV2Token);
        let client = UniteV2TokenClient::new(&e, &contract_id);
        
        e.mock_all_auths();
        
        client.init(&admin);
        client.mint(&user, &1000);
        
        assert_eq!(client.balance(&user), 1000);
    }

    #[test]
    fn test_transfer() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let user1 = Address::generate(&e);
        let user2 = Address::generate(&e);
        let contract_id = e.register_contract(None, UniteV2Token);
        let client = UniteV2TokenClient::new(&e, &contract_id);
        
        e.mock_all_auths();
        
        client.init(&admin);
        client.mint(&user1, &1000);
        client.transfer(&user1, &user2, &500);
        
        assert_eq!(client.balance(&user1), 500);
        assert_eq!(client.balance(&user2), 500);
    }

    #[test]
    fn test_burn() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let contract_id = e.register_contract(None, UniteV2Token);
        let client = UniteV2TokenClient::new(&e, &contract_id);
        
        e.mock_all_auths();
        
        client.init(&admin);
        client.mint(&user, &1000);
        client.burn(&user, &300);
        
        assert_eq!(client.balance(&user), 700);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_transfer_insufficient_balance() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let user1 = Address::generate(&e);
        let user2 = Address::generate(&e);
        let contract_id = e.register_contract(None, UniteV2Token);
        let client = UniteV2TokenClient::new(&e, &contract_id);
        
        e.mock_all_auths();
        
        client.init(&admin);
        client.transfer(&user1, &user2, &1000);
    }
} 