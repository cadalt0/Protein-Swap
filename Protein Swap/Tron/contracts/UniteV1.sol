// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

contract UniteV1 {
    string public name = "UNITE V1";
    string public symbol = "UNITE";
    uint8 public decimals = 18;
    uint256 public totalSupply = 0;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed to, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        balanceOf[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += addedValue;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }
    
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= subtractedValue, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= subtractedValue;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }
    
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance to burn");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function burnFrom(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "Insufficient balance to burn");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance to burn");
        
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(from, address(0), amount);
    }
} 