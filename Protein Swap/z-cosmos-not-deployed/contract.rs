#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    attr, to_json_binary, Addr, BankMsg, Binary, Coin, CosmosMsg, Deps, DepsMut, Env, 
    MessageInfo, Response, StdError, StdResult, Uint128, WasmMsg
};
use cw_storage_plus::{Map, Item};
use thiserror::Error;
use sha2::{Digest, Sha256};
use cw20::{Cw20ExecuteMsg, Cw20ReceiveMsg};
use serde::{Deserialize, Serialize};

// Error types
#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Escrow not found")]
    EscrowNotFound {},

    #[error("Hash mismatch")]
    HashMismatch {},

    #[error("Timelock not expired")]
    TimelockNotExpired {},

    #[error("Timelock already expired")]
    TimelockExpired {},

    #[error("Invalid amount")]
    InvalidAmount {},

    #[error("Escrow already exists")]
    EscrowAlreadyExists {},

    #[error("Escrow not active")]
    EscrowNotActive {},

    #[error("Invalid token")]
    InvalidToken {},
}

// Token information enum
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum TokenInfo {
    Native { denom: String },
    Cw20 { contract_addr: Addr },
}

// Escrow status enum
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
}

// Main escrow struct
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Escrow {
    pub order_id: String,
    pub hash: Vec<u8>,
    pub owner: Addr,
    pub taker: Addr,
    pub token: TokenInfo,
    pub amount: Uint128,
    pub timelock: u64,
    pub status: EscrowStatus,
    pub created_at: u64,
}

// Storage map for escrows, keyed by {order_id}:{owner}
const ESCROWS: Map<String, Escrow> = Map::new("escrows");
// Storage for contract owner
const CONTRACT_OWNER: Item<Addr> = Item::new("contract_owner");

// Message types
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InstantiateMsg {}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ExecuteMsg {
    CreateEscrow {
        order_id: String,
        hash: Vec<u8>,
        taker: Addr,
        token: TokenInfo,
        amount: Uint128,
        timelock_duration: u64,
    },
    RevealSecret {
        order_id: String,
        owner: Addr,
        secret: Vec<u8>,
    },
    CancelEscrow {
        order_id: String,
        owner: Addr,
    },
    /// Receive hook for CW20 tokens
    Receive(Cw20ReceiveMsg),
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum QueryMsg {
    EscrowExists { order_id: String, owner: Addr },
    GetEscrow { order_id: String, owner: Addr },
    IsEscrowActive { order_id: String, owner: Addr },
    IsTimelockExpired { order_id: String, owner: Addr },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct CreateEscrowMsg {
    pub order_id: String,
    pub hash: Vec<u8>,
    pub taker: Addr,
    pub timelock_duration: u64,
}

// Helper functions
fn create_escrow_key(order_id: &str, owner: &Addr) -> String {
    format!("{}:{}", order_id, owner)
}

fn hash_secret(secret: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(secret);
    hasher.finalize().to_vec()
}

// Contract entry points
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    // Store the contract owner (instantiator)
    CONTRACT_OWNER.save(deps.storage, &info.sender)?;
    
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("contract", "atomic_swap_escrow")
        .add_attribute("owner", info.sender))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateEscrow {
            order_id,
            hash,
            taker,
            token,
            amount,
            timelock_duration,
        } => execute_create_escrow(deps, env, info, order_id, hash, taker, token, amount, timelock_duration),
        ExecuteMsg::RevealSecret {
            order_id,
            owner,
            secret,
        } => execute_reveal_secret(deps, env, info, order_id, owner, secret),
        ExecuteMsg::CancelEscrow { order_id, owner } => {
            execute_cancel_escrow(deps, env, info, order_id, owner)
        }
        ExecuteMsg::Receive(msg) => execute_receive_cw20(deps, env, info, msg),
    }
}

fn execute_create_escrow(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    hash: Vec<u8>,
    taker: Addr,
    token: TokenInfo,
    amount: Uint128,
    timelock_duration: u64,
) -> Result<Response, ContractError> {
    // Validate inputs
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }

    if hash.is_empty() {
        return Err(ContractError::Std(StdError::generic_err("Hash cannot be empty")));
    }

    let key = create_escrow_key(&order_id, &info.sender);
    
    // Check if escrow already exists
    if ESCROWS.may_load(deps.storage, key.clone())?.is_some() {
        return Err(ContractError::EscrowAlreadyExists {});
    }

    // Validate token and funds based on token type
    let messages: Vec<CosmosMsg> = vec![];
    match &token {
        TokenInfo::Native { denom } => {
            // Check if the correct native token was sent
            let sent_amount = info.funds.iter()
                .find(|coin| coin.denom == *denom)
                .map(|coin| coin.amount)
                .unwrap_or_default();
            
            if sent_amount != amount {
                return Err(ContractError::InvalidAmount {});
            }
        }
        TokenInfo::Cw20 { .. } => {
            // For CW20 tokens, this should be called via Receive hook
            return Err(ContractError::Std(StdError::generic_err(
                "CW20 tokens must be sent via transfer with receive hook"
            )));
        }
    }

    let timelock = env.block.time.seconds() + timelock_duration;
    let escrow = Escrow {
        order_id: order_id.clone(),
        hash,
        owner: info.sender.clone(),
        taker,
        token,
        amount,
        timelock,
        status: EscrowStatus::Active,
        created_at: env.block.time.seconds(),
    };

    ESCROWS.save(deps.storage, key, &escrow)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attributes(vec![
            attr("method", "create_escrow"),
            attr("order_id", order_id),
            attr("owner", info.sender),
            attr("amount", amount),
            attr("timelock", timelock.to_string()),
        ]))
}

fn execute_receive_cw20(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    receive_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    // Parse the message to get escrow creation parameters
    let create_msg: CreateEscrowMsg = serde_json::from_str(&receive_msg.msg.to_string())
        .map_err(|_| ContractError::Std(StdError::generic_err("Invalid create escrow message")))?;

    let token = TokenInfo::Cw20 {
        contract_addr: info.sender.clone(),
    };

    // Validate inputs
    if receive_msg.amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }

    if create_msg.hash.is_empty() {
        return Err(ContractError::Std(StdError::generic_err("Hash cannot be empty")));
    }

    let sender = deps.api.addr_validate(&receive_msg.sender)?;
    let key = create_escrow_key(&create_msg.order_id, &sender);
    
    // Check if escrow already exists
    if ESCROWS.may_load(deps.storage, key.clone())?.is_some() {
        return Err(ContractError::EscrowAlreadyExists {});
    }

    let timelock = env.block.time.seconds() + create_msg.timelock_duration;
    let escrow = Escrow {
        order_id: create_msg.order_id.clone(),
        hash: create_msg.hash,
        owner: sender.clone(),
        taker: create_msg.taker,
        token,
        amount: receive_msg.amount,
        timelock,
        status: EscrowStatus::Active,
        created_at: env.block.time.seconds(),
    };

    ESCROWS.save(deps.storage, key, &escrow)?;

    Ok(Response::new()
        .add_attributes(vec![
            attr("method", "create_escrow_cw20"),
            attr("order_id", create_msg.order_id),
            attr("owner", sender),
            attr("amount", receive_msg.amount),
            attr("timelock", timelock.to_string()),
        ]))
}

fn execute_reveal_secret(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    owner: Addr,
    secret: Vec<u8>,
) -> Result<Response, ContractError> {
    let key = create_escrow_key(&order_id, &owner);
    let mut escrow = ESCROWS.load(deps.storage, key.clone())?;

    // Check if escrow is active
    if !matches!(escrow.status, EscrowStatus::Active) {
        return Err(ContractError::EscrowNotActive {});
    }

    // Check if timelock has expired
    if env.block.time.seconds() >= escrow.timelock {
        return Err(ContractError::TimelockExpired {});
    }

    // Only taker or contract owner can reveal the secret
    let contract_owner = CONTRACT_OWNER.load(deps.storage)?;
    if info.sender != escrow.taker && info.sender != contract_owner {
        return Err(ContractError::Unauthorized {});
    }

    // Verify the secret hash
    let computed_hash = hash_secret(&secret);
    if computed_hash != escrow.hash {
        return Err(ContractError::HashMismatch {});
    }

    // Create transfer message based on token type
    let transfer_msg = match &escrow.token {
        TokenInfo::Native { denom } => {
            CosmosMsg::Bank(BankMsg::Send {
                to_address: escrow.taker.to_string(),
                amount: vec![Coin {
                    denom: denom.clone(),
                    amount: escrow.amount,
                }],
            })
        }
        TokenInfo::Cw20 { contract_addr } => {
            CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: contract_addr.to_string(),
                msg: to_json_binary(&Cw20ExecuteMsg::Transfer {
                    recipient: escrow.taker.to_string(),
                    amount: escrow.amount,
                })?,
                funds: vec![],
            })
        }
    };

    // Update escrow status
    escrow.status = EscrowStatus::Completed;
    ESCROWS.save(deps.storage, key, &escrow)?;

    Ok(Response::new()
        .add_message(transfer_msg)
        .add_attributes(vec![
            attr("method", "reveal_secret"),
            attr("order_id", order_id),
            attr("owner", owner),
            attr("taker", escrow.taker),
            attr("amount", escrow.amount),
        ]))
}

fn execute_cancel_escrow(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    order_id: String,
    owner: Addr,
) -> Result<Response, ContractError> {
    let key = create_escrow_key(&order_id, &owner);
    let mut escrow = ESCROWS.load(deps.storage, key.clone())?;

    // Check if escrow is active
    if !matches!(escrow.status, EscrowStatus::Active) {
        return Err(ContractError::EscrowNotActive {});
    }

    // Only escrow owner or contract owner can cancel
    let contract_owner = CONTRACT_OWNER.load(deps.storage)?;
    if info.sender != escrow.owner && info.sender != contract_owner {
        return Err(ContractError::Unauthorized {});
    }

    // Contract owner can cancel anytime, escrow owner must wait for timelock
    if info.sender == escrow.owner && env.block.time.seconds() < escrow.timelock {
        return Err(ContractError::TimelockNotExpired {});
    }

    // Create refund message based on token type
    let refund_msg = match &escrow.token {
        TokenInfo::Native { denom } => {
            CosmosMsg::Bank(BankMsg::Send {
                to_address: escrow.owner.to_string(),
                amount: vec![Coin {
                    denom: denom.clone(),
                    amount: escrow.amount,
                }],
            })
        }
        TokenInfo::Cw20 { contract_addr } => {
            CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: contract_addr.to_string(),
                msg: to_json_binary(&Cw20ExecuteMsg::Transfer {
                    recipient: escrow.owner.to_string(),
                    amount: escrow.amount,
                })?,
                funds: vec![],
            })
        }
    };

    // Update escrow status
    escrow.status = EscrowStatus::Cancelled;
    ESCROWS.save(deps.storage, key, &escrow)?;

    Ok(Response::new()
        .add_message(refund_msg)
        .add_attributes(vec![
            attr("method", "cancel_escrow"),
            attr("order_id", order_id),
            attr("owner", owner),
            attr("amount", escrow.amount),
        ]))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::EscrowExists { order_id, owner } => {
            to_json_binary(&query_escrow_exists(deps, order_id, owner)?)
        }
        QueryMsg::GetEscrow { order_id, owner } => {
            to_json_binary(&query_get_escrow(deps, order_id, owner)?)
        }
        QueryMsg::IsEscrowActive { order_id, owner } => {
            to_json_binary(&query_is_escrow_active(deps, order_id, owner)?)
        }
        QueryMsg::IsTimelockExpired { order_id, owner } => {
            to_json_binary(&query_is_timelock_expired(deps, env, order_id, owner)?)
        }
    }
}

fn query_escrow_exists(deps: Deps, order_id: String, owner: Addr) -> StdResult<bool> {
    let key = create_escrow_key(&order_id, &owner);
    Ok(ESCROWS.may_load(deps.storage, key)?.is_some())
}

fn query_get_escrow(deps: Deps, order_id: String, owner: Addr) -> StdResult<Escrow> {
    let key = create_escrow_key(&order_id, &owner);
    ESCROWS.load(deps.storage, key)
}

fn query_is_escrow_active(deps: Deps, order_id: String, owner: Addr) -> StdResult<bool> {
    let key = create_escrow_key(&order_id, &owner);
    match ESCROWS.may_load(deps.storage, key)? {
        Some(escrow) => Ok(matches!(escrow.status, EscrowStatus::Active)),
        None => Ok(false),
    }
}

fn query_is_timelock_expired(deps: Deps, env: Env, order_id: String, owner: Addr) -> StdResult<bool> {
    let key = create_escrow_key(&order_id, &owner);
    match ESCROWS.may_load(deps.storage, key)? {
        Some(escrow) => Ok(env.block.time.seconds() >= escrow.timelock),
        None => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_json, Timestamp};

    #[test]
    fn test_instantiate() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &[]);
        let msg = InstantiateMsg {};

        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 2);
    }

    #[test]
    fn test_create_native_escrow() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("owner", &coins(1000, "uatom"));
        
        let msg = ExecuteMsg::CreateEscrow {
            order_id: "test_order".to_string(),
            hash: vec![1, 2, 3, 4],
            taker: Addr::unchecked("taker"),
            token: TokenInfo::Native { denom: "uatom".to_string() },
            amount: Uint128::new(1000),
            timelock_duration: 3600,
        };

        let res = execute(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(res.attributes.len(), 5);
    }

    #[test]
    fn test_query_escrow_exists() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("owner", &coins(1000, "uatom"));
        
        // Create escrow first
        let msg = ExecuteMsg::CreateEscrow {
            order_id: "test_order".to_string(),
            hash: vec![1, 2, 3, 4],
            taker: Addr::unchecked("taker"),
            token: TokenInfo::Native { denom: "uatom".to_string() },
            amount: Uint128::new(1000),
            timelock_duration: 3600,
        };
        execute(deps.as_mut(), env.clone(), info, msg).unwrap();

        // Query if escrow exists
        let query_msg = QueryMsg::EscrowExists {
            order_id: "test_order".to_string(),
            owner: Addr::unchecked("owner"),
        };
        let res = query(deps.as_ref(), env, query_msg).unwrap();
        let exists: bool = from_json(&res).unwrap();
        assert!(exists);
    }
}
