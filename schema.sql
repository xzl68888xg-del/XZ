-- 1. 用户核心账户主表 (支持分布式行级排他锁)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pay_password_hash VARCHAR(255),       
    balance DECIMAL(16, 4) DEFAULT 0.0000, -- 主账户高精度额度，严禁使用Float
    frozen_balance DECIMAL(16, 4) DEFAULT 0.0000, 
    status INT DEFAULT 1,                  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_username ON users(username);

-- 2. 核心账变事务流水主表 (原子追溯总账，拦截重复重试)
CREATE TABLE account_records (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    order_no VARCHAR(64) UNIQUE NOT NULL, 
    type VARCHAR(30) NOT NULL,            
    amount DECIMAL(16, 4) NOT NULL,       
    balance_before DECIMAL(16, 4) NOT NULL, 
    balance_after DECIMAL(16, 4) NOT NULL,  
    remark TEXT,                          
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_records_user_id ON account_records(user_id);

-- 3. 外部通道矩阵表 (应用大厅集成)
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    module_code VARCHAR(50) UNIQUE NOT NULL, 
    module_name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,        -- SLOT(模拟), LIVE(交互), CHESS(矩阵)
    provider VARCHAR(50) NOT NULL,        -- PG, CQ9, JILI 等底层厂商
    status INT DEFAULT 1,                  
    sort_order INT DEFAULT 0,              
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_modules_provider_status ON modules(provider, status);
