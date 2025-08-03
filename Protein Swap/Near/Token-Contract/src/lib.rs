use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, require, AccountId, Gas, NearToken, PanicOnDefault,
    PromiseOrValue, PromiseResult,
};

// Type alias for Balance
type Balance = u128;

// Gas constants for cross-contract calls
const GAS_FOR_FT_TRANSFER_CALL: Gas = Gas::from_tgas(25);
const GAS_FOR_RESOLVE_TRANSFER: Gas = Gas::from_tgas(10);

// Token metadata structure
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct FungibleTokenMetadata {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub icon: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
    pub decimals: u8,
}

// Events for NEP-297 standard
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct FtTransferEvent {
    pub old_owner_id: AccountId,
    pub new_owner_id: AccountId,
    pub amount: String,
    pub memo: Option<String>,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct FtMintEvent {
    pub owner_id: AccountId,
    pub amount: String,
    pub memo: Option<String>,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct FtBurnEvent {
    pub owner_id: AccountId,
    pub amount: String,
    pub memo: Option<String>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct UniteToken {
    /// AccountID -> Account balance.
    accounts: LookupMap<AccountId, Balance>,
    /// Total supply of the all token.
    total_supply: Balance,
    /// The bytes for the largest possible account ID that can be registered on the contract
    bytes_for_longest_account_id: u32,
    /// Metadata for the token
    metadata: FungibleTokenMetadata,
    /// Owner of the contract (can mint tokens)
    owner_id: AccountId,
}

impl Default for FungibleTokenMetadata {
    fn default() -> Self {
        Self {
            spec: "ft-1.0.0".to_string(),
            name: "UNITE V1".to_string(),
            symbol: "UNITE".to_string(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 24,
        }
    }
}

#[near_bindgen]
impl UniteToken {
    /// Initializes the contract with the given total supply owned by the given `owner_id`.
    #[init]
    pub fn new(owner_id: AccountId, total_supply: U128, metadata: Option<FungibleTokenMetadata>) -> Self {
        require!(!env::state_exists(), "Already initialized");
        
        let metadata = metadata.unwrap_or_default();
        require!(metadata.spec == "ft-1.0.0", "Unsupported metadata spec");
        
        let mut this = Self {
            accounts: LookupMap::new(b"a"),
            total_supply: total_supply.into(),
            bytes_for_longest_account_id: 64,
            metadata,
            owner_id: owner_id.clone(),
        };
        
        // Set initial balance for owner
        this.accounts.insert(&owner_id, &total_supply.into());
        
        // Log mint event for initial supply
        this.emit_mint_event(&owner_id, total_supply.into(), Some("Initial supply".to_string()));
        
        this
    }

    /// Simple mint function - anyone can mint tokens
    #[payable]
    pub fn mint(&mut self, account_id: AccountId, amount: U128) {
        self.assert_one_yocto();
        
        let amount: Balance = amount.into();
        require!(amount > 0, "Amount must be positive");
        
        let balance = self.accounts.get(&account_id).unwrap_or(0);
        self.accounts.insert(&account_id, &(balance + amount));
        self.total_supply += amount;
        
        self.emit_mint_event(&account_id, amount, None);
    }

    /// Burn tokens from caller's account
    #[payable]
    pub fn burn(&mut self, amount: U128) {
        self.assert_one_yocto();
        let account_id = env::predecessor_account_id();
        let amount: Balance = amount.into();
        
        let balance = self.accounts.get(&account_id).unwrap_or(0);
        require!(balance >= amount, "Insufficient balance to burn");
        
        self.accounts.insert(&account_id, &(balance - amount));
        self.total_supply -= amount;
        
        self.emit_burn_event(&account_id, amount, None);
    }

    /// Transfer ownership of the contract
    #[payable]
    pub fn transfer_ownership(&mut self, new_owner_id: AccountId) {
        self.assert_one_yocto();
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only current owner can transfer ownership"
        );
        self.owner_id = new_owner_id;
    }

    // Helper functions for events
    fn emit_transfer_event(&self, old_owner_id: &AccountId, new_owner_id: &AccountId, amount: Balance, memo: Option<String>) {
        let event = FtTransferEvent {
            old_owner_id: old_owner_id.clone(),
            new_owner_id: new_owner_id.clone(),
            amount: amount.to_string(),
            memo,
        };
        
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"nep171\",\"version\":\"1.0.0\",\"event\":\"ft_transfer\",\"data\":[{}]}}",
            near_sdk::serde_json::to_string(&event).unwrap()
        ));
    }

    fn emit_mint_event(&self, owner_id: &AccountId, amount: Balance, memo: Option<String>) {
        let event = FtMintEvent {
            owner_id: owner_id.clone(),
            amount: amount.to_string(),
            memo,
        };
        
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"nep171\",\"version\":\"1.0.0\",\"event\":\"ft_mint\",\"data\":[{}]}}",
            near_sdk::serde_json::to_string(&event).unwrap()
        ));
    }

    fn emit_burn_event(&self, owner_id: &AccountId, amount: Balance, memo: Option<String>) {
        let event = FtBurnEvent {
            owner_id: owner_id.clone(),
            amount: amount.to_string(),
            memo,
        };
        
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"nep171\",\"version\":\"1.0.0\",\"event\":\"ft_burn\",\"data\":[{}]}}",
            near_sdk::serde_json::to_string(&event).unwrap()
        ));
    }

    fn assert_one_yocto(&self) {
        require!(
            env::attached_deposit() == NearToken::from_yoctonear(1),
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
    }
}

// NEP-141 Standard Implementation
#[near_bindgen]
impl UniteToken {
    /// Returns the total supply of tokens.
    pub fn ft_total_supply(&self) -> U128 {
        self.total_supply.into()
    }

    /// Returns the balance of the account. If the account doesn't exist, returns 0.
    pub fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.accounts.get(&account_id).unwrap_or(0).into()
    }

    /// Transfers tokens from the caller to receiver.
    #[payable]
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.assert_one_yocto();
        let sender_id = env::predecessor_account_id();
        let amount: Balance = amount.into();
        self.internal_transfer(&sender_id, &receiver_id, amount, memo);
    }

    /// Transfers tokens from the caller to receiver and calls `ft_on_transfer` on receiver's contract.
    #[payable]
    pub fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.assert_one_yocto();
        let sender_id = env::predecessor_account_id();
        let amount: Balance = amount.into();
        
        self.internal_transfer(&sender_id, &receiver_id, amount, memo.clone());
        
        // Call ft_on_transfer on the receiver
        let promise = ext_ft_receiver::ext(receiver_id.clone())
            .with_static_gas(GAS_FOR_FT_TRANSFER_CALL)
            .with_attached_deposit(NearToken::from_yoctonear(0))
            .ft_on_transfer(sender_id.clone(), amount.into(), msg);
        
        // Chain with resolve_transfer callback
        promise.then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_FOR_RESOLVE_TRANSFER)
                .with_attached_deposit(NearToken::from_yoctonear(0))
                .ft_resolve_transfer(sender_id, receiver_id, amount.into())
        ).into()
    }

    /// Internal transfer function
    fn internal_transfer(&mut self, sender_id: &AccountId, receiver_id: &AccountId, amount: Balance, memo: Option<String>) {
        require!(amount > 0, "Amount must be positive");
        require!(sender_id != receiver_id, "Sender and receiver should be different");
        
        let sender_balance = self.accounts.get(sender_id).unwrap_or(0);
        require!(sender_balance >= amount, "Insufficient balance");
        
        // Update balances
        self.accounts.insert(sender_id, &(sender_balance - amount));
        let receiver_balance = self.accounts.get(receiver_id).unwrap_or(0);
        self.accounts.insert(receiver_id, &(receiver_balance + amount));
        
        // Emit transfer event
        self.emit_transfer_event(sender_id, receiver_id, amount, memo);
    }

    /// Callback to resolve transfer
    #[private]
    pub fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let amount: Balance = amount.into();
        
        // Get the unused amount from the previous promise result
        let unused_amount = match env::promise_result(0) {
            PromiseResult::Successful(value) => {
                if let Ok(unused_amount) = near_sdk::serde_json::from_slice::<U128>(&value) {
                    std::cmp::min(amount, unused_amount.0)
                } else {
                    amount
                }
            }
            PromiseResult::Failed => amount,
        };

        if unused_amount > 0 {
            let receiver_balance = self.accounts.get(&receiver_id).unwrap_or(0);
            if receiver_balance >= unused_amount {
                self.accounts.insert(&receiver_id, &(receiver_balance - unused_amount));
                let sender_balance = self.accounts.get(&sender_id).unwrap_or(0);
                self.accounts.insert(&sender_id, &(sender_balance + unused_amount));
                
                self.emit_transfer_event(&receiver_id, &sender_id, unused_amount, Some("Refund".to_string()));
            }
        }

        unused_amount.into()
    }
}

// NEP-148 Metadata Standard Implementation
#[near_bindgen]
impl UniteToken {
    pub fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}

// Additional view methods
#[near_bindgen]
impl UniteToken {
    pub fn get_owner(&self) -> AccountId {
        self.owner_id.clone()
    }

    pub fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        let required_storage_balance = Balance::from(self.bytes_for_longest_account_id) * env::storage_byte_cost().as_yoctonear();
        StorageBalanceBounds {
            min: required_storage_balance.into(),
            max: Some(required_storage_balance.into()),
        }
    }

    pub fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        if self.accounts.contains_key(&account_id) {
            Some(StorageBalance {
                total: self.storage_balance_bounds().min,
                available: 0.into(),
            })
        } else {
            None
        }
    }
}

#[derive(Serialize, Deserialize, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct StorageBalance {
    #[schemars(with = "String")]
    pub total: U128,
    #[schemars(with = "String")]
    pub available: U128,
}

#[derive(Serialize, Deserialize, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct StorageBalanceBounds {
    #[schemars(with = "String")]
    pub min: U128,
    #[schemars(with = "String")]
    pub max: Option<U128>,
}

// External contract interfaces
#[near_sdk::ext_contract(ext_ft_receiver)]
pub trait FungibleTokenReceiver {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, Balance};

    fn get_context(predecessor_account_id: AccountId, attached_deposit: Balance) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id)
            .attached_deposit(NearToken::from_yoctonear(attached_deposit));
        builder
    }

    #[test]
    fn test_new() {
        let mut context = get_context(accounts(1), 0);
        testing_env!(context.build());

        let total_supply = 1_000_000_000_000_000u128;
        let contract = UniteToken::new(accounts(1), total_supply.into(), None);
        
        assert_eq!(contract.ft_total_supply().0, total_supply);
        assert_eq!(contract.ft_balance_of(accounts(1)).0, total_supply);
        assert_eq!(contract.get_owner(), accounts(1));
    }

    #[test]
    fn test_transfer() {
        let mut context = get_context(accounts(2), 1);
        testing_env!(context.build());

        let total_supply = 1_000_000_000_000_000u128;
        let mut contract = UniteToken::new(accounts(2), total_supply.into(), None);
        let transfer_amount = 1_000_000_000_000u128;

        contract.ft_transfer(accounts(1), transfer_amount.into(), None);
        
        assert_eq!(contract.ft_balance_of(accounts(2)).0, total_supply - transfer_amount);
        assert_eq!(contract.ft_balance_of(accounts(1)).0, transfer_amount);
    }

    #[test]
    fn test_mint() {
        let mut context = get_context(accounts(1), 1);
        testing_env!(context.build());

        let total_supply = 1_000_000_000_000_000u128;
        let mut contract = UniteToken::new(accounts(1), total_supply.into(), None);
        let mint_amount = 1_000_000_000_000u128;

        contract.mint(accounts(2), mint_amount.into());
        
        assert_eq!(contract.ft_total_supply().0, total_supply + mint_amount);
        assert_eq!(contract.ft_balance_of(accounts(2)).0, mint_amount);
    }

    #[test]
    fn test_burn() {
        let mut context = get_context(accounts(1), 1);
        testing_env!(context.build());

        let total_supply = 1_000_000_000_000_000u128;
        let mut contract = UniteToken::new(accounts(1), total_supply.into(), None);
        let burn_amount = 1_000_000_000_000u128;

        contract.burn(burn_amount.into());
        
        assert_eq!(contract.ft_total_supply().0, total_supply - burn_amount);
        assert_eq!(contract.ft_balance_of(accounts(1)).0, total_supply - burn_amount);
    }

    #[test]
    #[should_panic(expected = "Insufficient balance")]
    fn test_transfer_insufficient_balance() {
        let mut context = get_context(accounts(1), 1);
        testing_env!(context.build());

        let total_supply = 1_000u128;
        let mut contract = UniteToken::new(accounts(1), total_supply.into(), None);

        contract.ft_transfer(accounts(2), (total_supply + 1).into(), None);
    }

    #[test]
    fn test_mint_by_anyone() {
        let mut context = get_context(accounts(2), 1);
        testing_env!(context.build());

        let total_supply = 1_000_000_000_000_000u128;
        let mut contract = UniteToken::new(accounts(1), total_supply.into(), None);
        let mint_amount = 1000u128;

        // Non-owner can mint tokens
        contract.mint(accounts(2), mint_amount.into());
        
        assert_eq!(contract.ft_total_supply().0, total_supply + mint_amount);
        assert_eq!(contract.ft_balance_of(accounts(2)).0, mint_amount);
    }
}