#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, log, symbol_short, Address, Bytes, Env, IntoVal, String, Symbol
};

// Status enum for escrow lifecycle
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
}

// Main escrow data structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub order_id: String,
    pub hash: Bytes,
    pub owner: Address,
    pub taker: Address,
    pub token_contract: Address,
    pub amount: i128,
    pub timelock: u64,
    pub status: EscrowStatus,
    pub created_at: u64,
}

// Storage keys for persistent storage
#[contracttype]
pub enum DataKey {
    Escrow(String, Address), // {order_id}:{owner}
}

// Custom error types
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    EscrowNotFound = 2,
    HashMismatch = 3,
    TimelockNotExpired = 4,
    TimelockExpired = 5,
    InvalidAmount = 6,
    EscrowAlreadyExists = 7,
    EscrowNotActive = 8,
}

// Event types for logging
#[contracttype]
pub struct EscrowCreatedEvent {
    pub order_id: String,
    pub owner: Address,
    pub taker: Address,
    pub token_contract: Address,
    pub amount: i128,
    pub timelock: u64,
}

#[contracttype]
pub struct EscrowCompletedEvent {
    pub order_id: String,
    pub owner: Address,
    pub taker: Address,
    pub amount: i128,
}

#[contracttype]
pub struct EscrowCancelledEvent {
    pub order_id: String,
    pub owner: Address,
    pub amount: i128,
}

#[contract]
pub struct AtomicSwapEscrowContract;

#[contractimpl]
impl AtomicSwapEscrowContract {
    /// Creates a new escrow with hashlock and timelock mechanisms
    pub fn create_escrow(
        env: Env,
        owner: Address,
        order_id: String,
        hash: Bytes,
        taker: Address,
        token_contract: Address,
        amount: i128,
        timelock_duration: u64,
    ) -> Result<(), Error> {
        // Require authorization from the owner
        owner.require_auth();

        // Validate amount
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }

        // Check if escrow already exists
        let key = DataKey::Escrow(order_id.clone(), owner.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::EscrowAlreadyExists);
        }

        // Get current ledger timestamp
        let current_time = env.ledger().timestamp();
        let timelock = current_time + timelock_duration;

        // Create escrow struct
        let escrow = Escrow {
            order_id: order_id.clone(),
            hash: hash.clone(),
            owner: owner.clone(),
            taker: taker.clone(),
            token_contract: token_contract.clone(),
            amount,
            timelock,
            status: EscrowStatus::Active,
            created_at: current_time,
        };

        // Transfer tokens from owner to contract
        let contract_address = env.current_contract_address();
        let transfer_args = soroban_sdk::vec![
            &env, 
            owner.into_val(&env), 
            contract_address.into_val(&env), 
            amount.into_val(&env)
        ];
        
        // Fix: Add explicit type annotation for invoke_contract
        let _result: () = env.invoke_contract(
            &token_contract,
            &Symbol::new(&env, "transfer"),
            transfer_args,
        );

        // Store escrow in persistent storage
        env.storage().persistent().set(&key, &escrow);

        // Emit EscrowCreated event
        let event = EscrowCreatedEvent {
            order_id: order_id.clone(),
            owner: owner.clone(),
            taker: taker.clone(),
            token_contract: token_contract.clone(),
            amount,
            timelock,
        };

        env.events().publish((symbol_short!("created"),), event);

        log!(&env, "Escrow created: order_id={}, amount={}", order_id, amount);
        Ok(())
    }

    /// Reveals the secret to complete the escrow swap
    pub fn reveal_secret(
        env: Env,
        caller: Address,
        order_id: String,
        owner: Address,
        secret: Bytes,
    ) -> Result<(), Error> {
        // Require authorization from the caller
        caller.require_auth();
        
        // Get escrow
        let key = DataKey::Escrow(order_id.clone(), owner.clone());
        let mut escrow: Escrow = env.storage().persistent()
            .get(&key)
            .ok_or(Error::EscrowNotFound)?;

        // Check if escrow is active
        if escrow.status != EscrowStatus::Active {
            return Err(Error::EscrowNotActive);
        }

        // Only taker or contract deployer can reveal the secret
        let contract_deployer = Address::from_string(&String::from_str(&env, "GDGFQGWD6DE6ZZO6F5SWBDB7N7RCYCW4B36IMNNLJKQHOYIKRSSVU6E2"));
        if caller != escrow.taker && caller != contract_deployer {
            return Err(Error::NotAuthorized);
        }

        // Check if timelock has not expired
        let current_time = env.ledger().timestamp();
        if current_time >= escrow.timelock {
            return Err(Error::TimelockExpired);
        }

        // Verify hash matches secret
        let computed_hash: Bytes = env.crypto().sha256(&secret).into();
        if computed_hash != escrow.hash {
            return Err(Error::HashMismatch);
        }

        // Transfer tokens to taker
        let contract_address = env.current_contract_address();
        let transfer_args = soroban_sdk::vec![
            &env, 
            contract_address.into_val(&env), 
            escrow.taker.into_val(&env), 
            escrow.amount.into_val(&env)
        ];
        
        // Fix: Add explicit type annotation for invoke_contract
        let _result: () = env.invoke_contract(
            &escrow.token_contract,
            &Symbol::new(&env, "transfer"),
            transfer_args,
        );

        // Update escrow status
        escrow.status = EscrowStatus::Completed;
        env.storage().persistent().set(&key, &escrow);

        // Emit EscrowCompleted event
        let event = EscrowCompletedEvent {
            order_id: order_id.clone(),
            owner: owner.clone(),
            taker: escrow.taker.clone(),
            amount: escrow.amount,
        };

        env.events().publish((symbol_short!("completed"),), event);

        log!(&env, "Escrow completed: order_id={}, amount={}", order_id, escrow.amount);
        Ok(())
    }

    /// Cancels an escrow after timelock expiry, returning tokens to owner
    pub fn cancel_escrow(
        env: Env,
        caller: Address,
        order_id: String,
        owner: Address,
    ) -> Result<(), Error> {
        // Require authorization from the caller
        caller.require_auth();
        
        // Get escrow
        let key = DataKey::Escrow(order_id.clone(), owner.clone());
        let mut escrow: Escrow = env.storage().persistent()
            .get(&key)
            .ok_or(Error::EscrowNotFound)?;

        // Check if escrow is active
        if escrow.status != EscrowStatus::Active {
            return Err(Error::EscrowNotActive);
        }

        // Only escrow owner or contract deployer can cancel
        let contract_deployer = Address::from_string(&String::from_str(&env, "GDGFQGWD6DE6ZZO6F5SWBDB7N7RCYCW4B36IMNNLJKQHOYIKRSSVU6E2"));
        if caller != escrow.owner && caller != contract_deployer {
            return Err(Error::NotAuthorized);
        }

        // Check if timelock has expired
        let current_time = env.ledger().timestamp();
        if current_time < escrow.timelock {
            return Err(Error::TimelockNotExpired);
        }

        // Transfer tokens back to owner
        let contract_address = env.current_contract_address();
        let transfer_args = soroban_sdk::vec![
            &env, 
            contract_address.into_val(&env), 
            escrow.owner.into_val(&env), 
            escrow.amount.into_val(&env)
        ];
        
        // Fix: Add explicit type annotation for invoke_contract
        let _result: () = env.invoke_contract(
            &escrow.token_contract,
            &Symbol::new(&env, "transfer"),
            transfer_args,
        );

        // Update escrow status
        escrow.status = EscrowStatus::Cancelled;
        env.storage().persistent().set(&key, &escrow);

        // Emit EscrowCancelled event
        let event = EscrowCancelledEvent {
            order_id: order_id.clone(),
            owner: owner.clone(),
            amount: escrow.amount,
        };

        env.events().publish((symbol_short!("cancelled"),), event);

        log!(&env, "Escrow cancelled: order_id={}, amount={}", order_id, escrow.amount);
        Ok(())
    }

    /// Checks if an escrow exists
    pub fn escrow_exists(env: Env, order_id: String, owner: Address) -> bool {
        let key = DataKey::Escrow(order_id, owner);
        env.storage().persistent().has(&key)
    }

    /// Retrieves escrow details
    pub fn get_escrow(env: Env, order_id: String, owner: Address) -> Result<Escrow, Error> {
        let key = DataKey::Escrow(order_id, owner);
        env.storage().persistent()
            .get(&key)
            .ok_or(Error::EscrowNotFound)
    }

    /// Checks if an escrow is in active status
    pub fn is_escrow_active(env: Env, order_id: String, owner: Address) -> Result<bool, Error> {
        let escrow = Self::get_escrow(env, order_id, owner)?;
        Ok(escrow.status == EscrowStatus::Active)
    }

    /// Checks if timelock has expired for an escrow
    pub fn is_timelock_expired(env: Env, order_id: String, owner: Address) -> Result<bool, Error> {
        let escrow = Self::get_escrow(env.clone(), order_id, owner)?;
        let current_time = env.ledger().timestamp();
        Ok(current_time >= escrow.timelock)
    }

    /// Utility function to get current ledger timestamp
    pub fn get_current_timestamp(env: Env) -> u64 {
        env.ledger().timestamp()
    }

    /// Utility function to compute SHA-256 hash of given data
    pub fn compute_hash(env: Env, data: Bytes) -> Bytes {
        env.crypto().sha256(&data).into()
    }
}

#[cfg(test)]
mod test;