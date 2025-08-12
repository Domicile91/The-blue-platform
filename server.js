const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins for now
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Blue Traders API',
        version: '1.0.0',
        port: PORT
    });
});

// Basic demo API routes
app.get('/api/demo', (req, res) => {
    res.json({
        success: true,
        message: 'Blue Traders API is running!',
        data: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

// Demo auth endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simple demo authentication
    if (email && password) {
        const isAdmin = email.includes('admin') || email === 'thebluetraders1@gmail.com';
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: isAdmin ? 'admin-123' : 'user-123',
                email: email,
                fullName: isAdmin ? 'Admin User' : 'Demo User',
                role: isAdmin ? 'admin' : 'user',
                isVerified: true
            },
            token: 'demo-jwt-token-' + Date.now()
        });
    } else {
        res.status(400).json({
            success: false,
            message: 'Email and password required'
        });
    }
});

app.post('/api/auth/signup', (req, res) => {
    const { email, password, fullName } = req.body;
    
    if (email && password && fullName) {
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: 'user-' + Date.now(),
                email: email,
                fullName: fullName,
                role: 'user',
                isVerified: true
            },
            token: 'demo-jwt-token-' + Date.now()
        });
    } else {
        res.status(400).json({
            success: false,
            message: 'All fields required'
        });
    }
});

// Demo accounts endpoint
app.get('/api/accounts', (req, res) => {
    res.json({
        success: true,
        accounts: [
            {
                id: 'demo-001',
                type: 'Demo',
                balance: 10000,
                currency: 'USD',
                status: 'Active',
                server: 'MT5-Demo-01',
                login: '12345678',
                createdAt: new Date().toISOString()
            }
        ]
    });
});

// Demo transactions endpoint
app.get('/api/transactions', (req, res) => {
    res.json({
        success: true,
        transactions: [
            {
                id: 'tx-001',
                type: 'deposit',
                amount: 1000,
                currency: 'USD',
                status: 'completed',
                method: 'demo',
                createdAt: new Date().toISOString()
            }
        ]
    });
});

// In-memory storage for balances and transactions (replace with database in production)
let userBalances = {
    'site_earnings': 3014.05,
    'demo-001': 10000,
    'main_system': 15420.75
};

let withdrawalTransactions = [];

// POST /api/transactions/withdraw - Process withdrawal requests
app.post('/api/transactions/withdraw', (req, res) => {
    try {
        const { accountId, amount, method, mobile, provider } = req.body;
        
        console.log('🏦 Processing withdrawal:', { accountId, amount, method, mobile, provider });
        
        // Validate required fields
        if (!accountId || !amount || !method) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: accountId, amount, method'
            });
        }

        const withdrawalAmount = parseFloat(amount);
        
        // Validate amount
        if (withdrawalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Withdrawal amount must be greater than 0'
            });
        }

        // Check minimum withdrawal
        const minAmount = 10;
        if (withdrawalAmount < minAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal amount is $${minAmount}`
            });
        }

        // Get current balance
        const currentBalance = userBalances[accountId] || 0;
        
        // Check sufficient balance
        if (currentBalance < withdrawalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance for withdrawal'
            });
        }

        // Create withdrawal transaction
        const transaction = {
            id: 'wd-' + Date.now(),
            accountId: accountId,
            type: 'withdrawal',
            amount: withdrawalAmount,
            method: method,
            mobile: mobile,
            provider: provider,
            status: 'processing',
            createdAt: new Date().toISOString(),
            reference: 'WD' + Date.now().toString().slice(-8)
        };

        // Store transaction
        withdrawalTransactions.push(transaction);

        // Deduct balance immediately (for live system)
        userBalances[accountId] = currentBalance - withdrawalAmount;

        console.log('✅ Balance updated:', {
            account: accountId,
            oldBalance: currentBalance,
            newBalance: userBalances[accountId],
            withdrawn: withdrawalAmount
        });

        // For mobile money, simulate processing
        if (method === 'mobile_money' && mobile) {
            // Simulate processing time
            setTimeout(() => {
                const txIndex = withdrawalTransactions.findIndex(tx => tx.id === transaction.id);
                if (txIndex !== -1) {
                    withdrawalTransactions[txIndex].status = 'completed';
                    withdrawalTransactions[txIndex].completedAt = new Date().toISOString();
                    console.log('📱 Mobile money withdrawal completed:', transaction.id);
                }
            }, 3000); // Complete after 3 seconds

            transaction.status = 'completed'; // Immediately mark as completed for demo
        }

        res.json({
            success: true,
            message: 'Withdrawal processed successfully',
            transaction: transaction,
            newBalance: userBalances[accountId]
        });

    } catch (error) {
        console.error('❌ Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/accounts/:id/balance - Get account balance
app.get('/api/accounts/:id/balance', (req, res) => {
    const { id } = req.params;
    const balance = userBalances[id] || 0;
    
    res.json({
        success: true,
        accountId: id,
        balance: balance,
        currency: 'USD'
    });
});

// GET /api/transactions/withdrawals - Get withdrawal history
app.get('/api/transactions/withdrawals', (req, res) => {
    res.json({
        success: true,
        transactions: withdrawalTransactions
    });
});

// POST /api/accounts/update-balance - Update account balance (admin only)
app.post('/api/accounts/update-balance', (req, res) => {
    const { accountId, newBalance } = req.body;
    
    if (!accountId || newBalance === undefined) {
        return res.status(400).json({
            success: false,
            message: 'AccountId and newBalance required'
        });
    }

    userBalances[accountId] = parseFloat(newBalance);
    
    res.json({
        success: true,
        message: 'Balance updated successfully',
        accountId: accountId,
        newBalance: userBalances[accountId]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Blue Traders API server running on port ${PORT}`);
    console.log(`📱 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 API Demo: http://localhost:${PORT}/api/demo`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
