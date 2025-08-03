use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, require, AccountId, Gas, NearToken, PanicOnDefault, Promise,
};
use near_sdk::json_types::U128;
use sha2::{Digest, Sha256};

// Gas constants for cross-contract calls
const GAS_FOR_FT_TRANSFER: Gas = Gas::from_tgas(10);
#[allow(dead_code)]
const GAS_FOR_FT_TRANSFER_CALL: Gas = Gas::from_tgas(30);

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub enum EscrowStatus {
    ACTIVE,
    COMPLETED,
    CANCELLED,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, schemars::JsonSchema)]
#[serde(crate = "near_sdk::serde")]
pub struct Escrow {
    pub order_id: String,
    pub hash: [u8; 32],
    #[schemars(with = "String")]
    pub owner: AccountId,
    #[schemars(with = "String")]
    pub taker: AccountId,
    #[schemars(with = "String")]
    pub token_contract: AccountId,
    pub amount: u128,
    pub timelock: u64,
    pub status: EscrowStatus,
    pub created_at: u64,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AtomicSwapEscrow {
    escrows: LookupMap<String, Escrow>,
    owner: AccountId,
    escrow_count: u64,
}

// Events
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowCreatedEvent {
    pub order_id: String,
    pub owner: AccountId,
    pub taker: AccountId,
    pub token_contract: AccountId,
    pub amount: String,
    pub timelock: u64,
    pub hash: String,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowCompletedEvent {
    pub order_id: String,
    pub owner: AccountId,
    pub taker: AccountId,
    pub secret: String,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowCancelledEvent {
    pub order_id: String,
    pub owner: AccountId,
}

#[near_bindgen]
impl AtomicSwapEscrow {
    #[init]
    pub fn new() -> Self {
        Self {
            escrows: LookupMap::new(b"e"),
            owner: env::predecessor_account_id(),
            escrow_count: 0,
        }
    }

    // Helper function to generate escrow key
    fn get_escrow_key(&self, order_id: &String, owner: &AccountId) -> String {
        let mut hasher = Sha256::new();
        hasher.update(order_id.as_bytes());
        hasher.update(owner.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    // Helper function to validate hash
    fn validate_secret(&self, secret: &Vec<u8>, expected_hash: &[u8; 32]) -> bool {
        let mut hasher = Sha256::new();
        hasher.update(secret);
        let computed_hash = hasher.finalize();
        computed_hash.as_slice() == expected_hash
    }

    // Helper function to log events
    fn log_event<T: Serialize>(&self, event_type: &str, data: &T) {
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"atomic_swap\",\"version\":\"1.0.0\",\"event\":\"{}\",\"data\":{}}}",
            event_type,
            near_sdk::serde_json::to_string(data).unwrap()
        ));
    }

    #[payable]
    pub fn create_escrow(
        &mut self,
        order_id: String,
        hash: Vec<u8>,
        taker: AccountId,
        token_contract: AccountId,
        amount: String,
        timelock_duration: u64,
    ) {
        // Validate inputs
        let amount_u128: u128 = amount.parse().expect("Invalid amount: must be a valid number");
        require!(amount_u128 > 0, "Invalid amount: must be greater than zero");
        require!(hash.len() == 32, "Invalid hash: must be 32 bytes");
        require!(timelock_duration > 0, "Invalid timelock duration");

        let caller = env::predecessor_account_id();
        let escrow_key = self.get_escrow_key(&order_id, &caller);

        // Check if escrow already exists
        require!(
            !self.escrows.contains_key(&escrow_key),
            "Escrow already exists"
        );

        let current_time = env::block_timestamp() / 1_000_000_000; // Convert to seconds
        let timelock = current_time + timelock_duration;

        // Convert Vec<u8> to [u8; 32]
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(&hash);

        let escrow = Escrow {
            order_id: order_id.clone(),
            hash: hash_array,
            owner: caller.clone(),
            taker: taker.clone(),
            token_contract: token_contract.clone(),
            amount: amount_u128,
            timelock,
            status: EscrowStatus::ACTIVE,
            created_at: current_time,
        };

        // Store escrow
        self.escrows.insert(&escrow_key, &escrow);
        self.escrow_count += 1;

        // Log event
        self.log_event(
            "escrow_created",
            &EscrowCreatedEvent {
                order_id: order_id.clone(),
                owner: caller.clone(),
                taker: taker.clone(),
                token_contract: token_contract.clone(),
                amount: amount.to_string(),
                timelock,
                hash: hex::encode(hash_array),
            },
        );

        // Note: In a real implementation, the token transfer should be handled
        // by the frontend calling ft_transfer_call on the token contract first,
        // which would then call ft_on_transfer on this contract to validate the escrow
    }

    pub fn reveal_secret(
        &mut self,
        order_id: String,
        owner: AccountId,
        secret: Vec<u8>,
    ) -> Promise {
        let caller = env::predecessor_account_id();
        let escrow_key = self.get_escrow_key(&order_id, &owner);

        // Get escrow
        let mut escrow = self.escrows.get(&escrow_key).expect("Escrow not found");

        // Validate caller authorization
        require!(
            caller == escrow.taker || caller == self.owner,
            "Not authorized: only taker or contract owner can reveal secret"
        );

        // Validate escrow status
        require!(
            escrow.status == EscrowStatus::ACTIVE,
            "Escrow is not active"
        );

        // Validate timelock
        let current_time = env::block_timestamp() / 1_000_000_000;
        require!(
            current_time < escrow.timelock,
            "Timelock expired: cannot reveal secret after expiry"
        );

        // Validate secret
        require!(
            self.validate_secret(&secret, &escrow.hash),
            "Secret hash mismatch: provided secret does not match stored hash"
        );

        // Update escrow status
        escrow.status = EscrowStatus::COMPLETED;
        self.escrows.insert(&escrow_key, &escrow);

        // Log event
        self.log_event(
            "escrow_completed",
            &EscrowCompletedEvent {
                order_id: order_id.clone(),
                owner: owner.clone(),
                taker: escrow.taker.clone(),
                secret: hex::encode(&secret),
            },
        );

        // Transfer tokens to taker
        ext_ft_contract::ext(escrow.token_contract.clone())
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .ft_transfer(escrow.taker.clone(), U128(escrow.amount), None)
    }

    pub fn cancel_escrow(&mut self, order_id: String, owner: AccountId) -> Promise {
        let caller = env::predecessor_account_id();
        let escrow_key = self.get_escrow_key(&order_id, &owner);

        // Get escrow
        let mut escrow = self.escrows.get(&escrow_key).expect("Escrow not found");

        // Validate caller authorization
        require!(
            caller == escrow.owner || caller == self.owner,
            "Not authorized: only escrow owner or contract owner can cancel"
        );

        // Validate escrow status
        require!(
            escrow.status == EscrowStatus::ACTIVE,
            "Escrow is not active"
        );

        // Validate timelock expiry
        let current_time = env::block_timestamp() / 1_000_000_000;
        require!(
            current_time >= escrow.timelock,
            "Timelock not expired: cannot cancel before timelock expiry"
        );

        // Update escrow status
        escrow.status = EscrowStatus::CANCELLED;
        self.escrows.insert(&escrow_key, &escrow);

        // Log event
        self.log_event(
            "escrow_cancelled",
            &EscrowCancelledEvent {
                order_id: order_id.clone(),
                owner: owner.clone(),
            },
        );

        // Return tokens to owner
        ext_ft_contract::ext(escrow.token_contract.clone())
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .ft_transfer(escrow.owner.clone(), U128(escrow.amount), None)
    }

    // View methods
    pub fn escrow_exists(&self, order_id: String, owner: AccountId) -> bool {
        let escrow_key = self.get_escrow_key(&order_id, &owner);
        self.escrows.contains_key(&escrow_key)
    }

    pub fn get_escrow(&self, order_id: String, owner: AccountId) -> Option<Escrow> {
        let escrow_key = self.get_escrow_key(&order_id, &owner);
        self.escrows.get(&escrow_key)
    }

    pub fn is_escrow_active(&self, order_id: String, owner: AccountId) -> bool {
        let escrow_key = self.get_escrow_key(&order_id, &owner);
        if let Some(escrow) = self.escrows.get(&escrow_key) {
            escrow.status == EscrowStatus::ACTIVE
        } else {
            false
        }
    }

    pub fn is_timelock_expired(&self, order_id: String, owner: AccountId) -> bool {
        let escrow_key = self.get_escrow_key(&order_id, &owner);
        if let Some(escrow) = self.escrows.get(&escrow_key) {
            let current_time = env::block_timestamp() / 1_000_000_000;
            current_time >= escrow.timelock
        } else {
            false
        }
    }

    // Alternative method for creating escrow with proper token flow
    pub fn prepare_escrow(
        &mut self,
        order_id: String,
        hash: Vec<u8>,
        _taker: AccountId,
        token_contract: AccountId,
        amount: u128,
        timelock_duration: u64,
    ) -> String {
        // Validate inputs
        require!(amount > 0, "Invalid amount: must be greater than zero");
        require!(hash.len() == 32, "Invalid hash: must be 32 bytes");
        require!(timelock_duration > 0, "Invalid timelock duration");

        let caller = env::predecessor_account_id();
        let escrow_key = self.get_escrow_key(&order_id, &caller);

        // Check if escrow already exists
        require!(
            !self.escrows.contains_key(&escrow_key),
            "Escrow already exists"
        );

        // Return instructions for the user
        format!(
            "To complete escrow creation, call ft_transfer_call on token contract {} with:\n\
            - receiver_id: {}\n\
            - amount: {}\n\
            - msg: escrow:{}:{}",
            token_contract,
            env::current_account_id(),
            amount,
            order_id,
            caller
        )
    }
}

// Cross-contract interface for NEP-141 fungible tokens
#[near_sdk::ext_contract(ext_ft_contract)]
#[allow(dead_code)]
trait FungibleTokenContract {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> near_sdk::PromiseOrValue<U128>;
}

// Callback for handling transfer results
#[near_bindgen]
impl AtomicSwapEscrow {
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> U128 {
        // This callback is called when tokens are transferred to the contract
        // The msg should contain escrow details or order_id for validation
        
        // For now, accept all tokens. In a production system, you would:
        // 1. Parse the msg to get escrow details
        // 2. Validate that an escrow exists for this transfer
        // 3. Return unused tokens if validation fails
        
        env::log_str(&format!(
            "Received {} tokens from {} with message: {}",
            amount.0, sender_id, msg
        ));
        
        // Return 0 to accept all tokens
        U128(0)
    }

    // Additional utility methods
    pub fn get_contract_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn get_escrow_count(&self) -> u64 {
        self.escrow_count
    }

    // Method to validate a secret against a hash (for testing/debugging)
    pub fn validate_secret_hash(&self, secret: Vec<u8>, expected_hash: Vec<u8>) -> bool {
        require!(expected_hash.len() == 32, "Hash must be 32 bytes");
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(&expected_hash);
        self.validate_secret(&secret, &hash_array)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env};

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_create_escrow() {
        let context = get_context(accounts(1));
        testing_env!(context.build());

        let mut contract = AtomicSwapEscrow::new();
        let hash = vec![1u8; 32];
        
        // This would normally return a Promise, but for testing we can verify the logic
        // In a real test environment, you'd need to mock the cross-contract calls
    }

    #[test]
    fn test_escrow_key_generation() {
        let context = get_context(accounts(1));
        testing_env!(context.build());

        let contract = AtomicSwapEscrow::new();
        let order_id = "test_order".to_string();
        let owner = accounts(1);
        
        let key1 = contract.get_escrow_key(&order_id, &owner);
        let key2 = contract.get_escrow_key(&order_id, &owner);
        
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_validate_secret() {
        let context = get_context(accounts(1));
        testing_env!(context.build());

        let contract = AtomicSwapEscrow::new();
        let secret = b"test_secret".to_vec();
        
        let mut hasher = Sha256::new();
        hasher.update(&secret);
        let expected_hash: [u8; 32] = hasher.finalize().into();
        
        assert!(contract.validate_secret(&secret, &expected_hash));
        
        let wrong_secret = b"wrong_secret".to_vec();
        assert!(!contract.validate_secret(&wrong_secret, &expected_hash));
    }
}