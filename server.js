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
