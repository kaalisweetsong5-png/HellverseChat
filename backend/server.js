import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

// Force production mode if deployed (detect Railway/cloud environment)
const isProduction = process.env.NODE_ENV === 'production' 
  || process.env.RAILWAY_ENVIRONMENT 
  || process.env.PORT 
  || process.argv.includes('--production');

// Override NODE_ENV if we detect cloud deployment
if (isProduction && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'production';
  console.log('🚀 Detected cloud deployment, forcing production mode');
}

console.log('🌍 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  PORT: process.env.PORT,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
});

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Maintenance mode configuration
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true' || false;
const MAINTENANCE_MESSAGE = process.env.MAINTENANCE_MESSAGE || 'HellverseChat is currently undergoing maintenance. Please check back soon!';
const MAINTENANCE_ETA = process.env.MAINTENANCE_ETA || null;
const CORS_ORIGIN = isProduction 
  ? (origin, callback) => {
      // Allow same origin requests (when frontend and backend are on same domain)
      if (!origin) return callback(null, true);
      // Allow Railway domains and custom domains
      if (origin.includes('railway.app') || origin.includes('hellversechat.com')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  : "http://localhost:5173";

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data persistence
const DATA_FILE = './data.json';

// Initialize data structures
const users = new Map(); // username -> { passwordHash, email, isAdmin, characters: Map(characterId -> character) }
const characters = new Map(); // characterId -> { id, name, ownerId, ... }
const socketsByCharacter = new Map(); // characterId -> socketId

// Load data from file
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      
      // Load users
      if (data.users) {
        Object.entries(data.users).forEach(([username, userData]) => {
          // Convert characters object back to Map
          const charactersMap = new Map();
          if (userData.characters) {
            Object.entries(userData.characters).forEach(([charId, charData]) => {
              charactersMap.set(charId, charData);
            });
          }
          
          users.set(username, {
            ...userData,
            characters: charactersMap
          });
        });
      }
      
      // Load characters
      if (data.characters) {
        Object.entries(data.characters).forEach(([charId, charData]) => {
          characters.set(charId, charData);
        });
      }
      
      console.log(`📁 Loaded ${users.size} users and ${characters.size} characters from ${DATA_FILE}`);
    } else {
      console.log('📁 No data file found, starting with empty data');
    }
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
};

// Save data to file
const saveData = () => {
  try {
    const data = {
      users: {},
      characters: {}
    };
    
    // Convert users Map to object
    users.forEach((userData, username) => {
      // Convert characters Map to object
      const charactersObj = {};
      userData.characters.forEach((charData, charId) => {
        charactersObj[charId] = charData;
      });
      
      data.users[username] = {
        ...userData,
        characters: charactersObj
      };
    });
    
    // Convert characters Map to object
    characters.forEach((charData, charId) => {
      data.characters[charId] = charData;
    });
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${users.size} users and ${characters.size} characters to ${DATA_FILE}`);
    
    // In Railway/production, also log users for debugging
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('🔍 Current users in memory:', Array.from(users.keys()));
    }
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
};

// Load data on startup
loadData();

// Create default admin user if no users exist (for ephemeral filesystems like Railway)
const createDefaultUsers = async () => {
  if (users.size === 0) {
    console.log('🔧 No users found, creating default admin user...');
    
    try {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(defaultPassword, 10);
      
      const adminUser = {
        passwordHash: hash,
        email: 'admin@hellversechat.com',
        isAdmin: true,
        characters: new Map(),
        createdAt: new Date().toISOString()
      };
      
      users.set('HellverseAdmin', adminUser);
      console.log('✅ Created default admin user: HellverseAdmin');
      console.log('🔑 Default password:', defaultPassword);
      
      saveData(); // Attempt to save (will work locally, ignored in Railway)
    } catch (error) {
      console.error('❌ Failed to create default admin user:', error);
    }
  }
};

// Create default users after loading
createDefaultUsers();
const bannedUsers = new Set();
const channels = new Set(["main", "general", "adult", "fantasy", "sci-fi"]);
const newsArticles = new Map(); // In-memory news storage (use database in production)
const pendingVerifications = new Map(); // email -> { username, passwordHash, email, code, expiresAt }

// Admin configuration - add your username here
const ADMIN_USERS = new Set([
  process.env.ADMIN_USERNAME || "admin", // Set via environment variable
  "HellchatAdmin", // Default admin - change this to your username
]);

// Helper functions
const isAdmin = (username) => ADMIN_USERS.has(username);
const isBanned = (username) => bannedUsers.has(username);

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email provider configurations
const getEmailConfig = (emailUser) => {
  console.log('🔧 getEmailConfig called with emailUser:', emailUser);
  
  if (!emailUser || typeof emailUser !== 'string') {
    console.error('❌ Invalid emailUser provided:', emailUser);
    throw new Error('Valid email user is required');
  }
  
  if (!emailUser.includes('@')) {
    console.error('❌ emailUser does not contain @ symbol:', emailUser);
    throw new Error('Email must contain @ symbol');
  }
  
  const domain = emailUser.split('@')[1]?.toLowerCase();
  console.log('🌐 Extracted domain:', domain);
  
  // Well-known email provider configurations
  const providers = {
    // Gmail
    'gmail.com': {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      name: 'Gmail'
    },
    // Outlook/Hotmail/Live
    'outlook.com': {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      name: 'Outlook'
    },
    'hotmail.com': {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      name: 'Hotmail'
    },
    'live.com': {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      name: 'Live'
    },
    // Yahoo
    'yahoo.com': {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      name: 'Yahoo'
    },
    'yahoo.co.uk': {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      name: 'Yahoo UK'
    },
    // iCloud
    'icloud.com': {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false,
      name: 'iCloud'
    },
    'me.com': {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false,
      name: 'iCloud (me.com)'
    },
    // AOL
    'aol.com': {
      host: 'smtp.aol.com',
      port: 587,
      secure: false,
      name: 'AOL'
    },
    // Zoho
    'zoho.com': {
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      name: 'Zoho'
    },
    // ProtonMail
    'protonmail.com': {
      host: 'smtp.protonmail.com',
      port: 587,
      secure: false,
      name: 'ProtonMail'
    },
    'pm.me': {
      host: 'smtp.protonmail.com',
      port: 587,
      secure: false,
      name: 'ProtonMail'
    }
  };

  // Check if we have a configuration for this provider
  console.log('🔍 Looking up provider for domain:', domain);
  console.log('🔍 Available providers:', Object.keys(providers));
  const providerConfig = providers[domain];
  console.log('🔍 Found provider config:', providerConfig ? providerConfig.name : 'none');
  
  if (providerConfig) {
    console.log(`📧 Auto-detected email provider: ${providerConfig.name} (${domain})`);
    return {
      host: process.env.EMAIL_HOST || providerConfig.host,
      port: process.env.EMAIL_PORT || providerConfig.port,
      secure: providerConfig.secure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
  } else {
    // Fallback to manual configuration or Gmail defaults
    console.log(`📧 Unknown email provider (${domain}), using manual/Gmail configuration`);
    return {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
  }
};

// Service-based email functions
const sendWithResend = async (email, code) => {
  try {
    console.log('📧 Sending email via Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'HellverseChat <onboarding@resend.dev>',
        to: [email],
        subject: 'HellverseChat - Verify Your Account',
        html: getEmailTemplate(code)
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();
    console.log('📧 Email sent successfully via Resend:', result.id);
    return result;
    
  } catch (error) {
    console.error('❌ Resend email error:', error);
    throw new Error('Failed to send verification email via Resend');
  }
};

const getEmailTemplate = (code) => `
  <div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; font-family: Arial, sans-serif;">
    <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 20px; border-radius: 8px; border: 2px solid #3498db;">
      <h1 style="color: #3498db; text-align: center; margin-bottom: 20px;">
        🔥 Welcome to HellverseChat! 🔥
      </h1>
      <p style="font-size: 18px; margin-bottom: 30px; text-align: center;">
        Your supernatural journey begins here. Verify your account to join the darkness:
      </p>
      <div style="background: #34495e; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <h2 style="color: #3498db; font-size: 32px; letter-spacing: 8px; margin: 0;">
          ${code}
        </h2>
      </div>
      <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 10px;">
        • This code will expire in 10 minutes
      </p>
      <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 20px;">
        • If you didn't create this account, you can safely ignore this email
      </p>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #7f8c8d; font-size: 12px;">
          HellverseChat - Supernatural Roleplaying Community<br>
          Create your character and join the darkness!
        </p>
      </div>
    </div>
  </div>
`;

// Email sending function with nodemailer
const sendVerificationEmail = async (email, code) => {
  console.log('📧 sendVerificationEmail called with:', { 
    email, 
    code, 
    hasEmailUser: !!process.env.EMAIL_USER, 
    hasEmailPass: !!process.env.EMAIL_PASS,
    hasResendKey: !!process.env.RESEND_API_KEY
  });

  // Priority: Gmail/SMTP first (more reliable for public signups)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('📧 Using Gmail/SMTP for email sending...');
    return await sendWithSMTP(email, code);
  }

  // Fallback to Resend if configured
  if (process.env.RESEND_API_KEY) {
    console.log('📧 Using Resend API for email sending...');
    return await sendWithResend(email, code);
  }

  // Development mode
  console.log(`📧 [DEV MODE] Verification email would be sent to: ${email}`);
  console.log(`📧 [DEV MODE] Verification code: ${code}`);
  console.log(`📧 [DEV MODE] Email Options:`);
  console.log(`📧 [DEV MODE] 1. Gmail (Recommended): Set EMAIL_USER and EMAIL_PASS`);
  console.log(`📧 [DEV MODE] 2. Resend Service: Set RESEND_API_KEY`);
  console.log(`📧 [DEV MODE] 3. Other providers: Auto-detected from EMAIL_USER domain`);
  return Promise.resolve();
};

// SMTP-based email sending (Gmail, Outlook, Yahoo, etc.)
const sendWithSMTP = async (email, code) => {
  console.log('📧 SMTP: Getting email configuration...');
  const emailConfig = getEmailConfig(process.env.EMAIL_USER);
  console.log('📧 SMTP: Email config created:', JSON.stringify(emailConfig, null, 2));

  try {
    console.log('📧 SMTP: Creating nodemailer transporter...');
    const transporter = nodemailer.createTransport(emailConfig);
    console.log('📧 SMTP: Transporter created successfully');

    const mailOptions = {
      from: `"HellverseChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'HellverseChat - Verify Your Account',
      text: `Welcome to HellverseChat! Your verification code is: ${code}. This code will expire in 10 minutes.`,
      html: `
        <div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 20px; border-radius: 8px; border: 2px solid #3498db;">
            <h1 style="color: #3498db; text-align: center; margin-bottom: 20px;">
              🔥 Welcome to HellverseChat! 🔥
            </h1>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Welcome to the supernatural roleplaying community! To complete your registration, please use the verification code below:
            </p>
            <div style="background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="color: #3498db; font-size: 32px; letter-spacing: 8px; margin: 0;">
                ${code}
              </h2>
            </div>
            <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 10px;">
              • This code will expire in 10 minutes
            </p>
            <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 20px;">
              • If you didn't create this account, you can safely ignore this email
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 12px;">
                HellverseChat - Supernatural Roleplaying Community<br>
                Create your character and join the darkness!
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log('📧 SMTP: Attempting to send email with options:', JSON.stringify({
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    }, null, 2));
    
    await transporter.sendMail(mailOptions);
    console.log(`📧 SMTP: Verification email sent successfully to: ${email}`);
  } catch (error) {
    console.error('❌ SMTP: Email sending error:', error);
    console.error('❌ SMTP: Email error stack:', error.stack);
    throw new Error('Failed to send verification email via SMTP');
  }
};

const app = express();
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Maintenance mode middleware
app.use((req, res, next) => {
  // Skip maintenance check for health, maintenance API, and static assets
  if (req.path === '/health' || 
      req.path === '/api/maintenance' || 
      req.path.startsWith('/static/') ||
      req.path.includes('.')) {
    return next();
  }
  
  if (MAINTENANCE_MODE) {
    // For API routes, return JSON
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        maintenanceMode: true,
        message: MAINTENANCE_MESSAGE,
        eta: MAINTENANCE_ETA
      });
    }
    
    // For web routes, let the frontend handle maintenance display
    // The frontend will check the maintenance API and show appropriate page
  }
  
  next();
});

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../frontend/dist');
console.log('🔍 Checking frontend path:', frontendPath);
console.log('🔍 Production mode:', isProduction);

// Always try to serve frontend if it exists (production or development with built frontend)
try {
  if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend dist found, serving static files');
    app.use(express.static(frontendPath));
    console.log('🎯 Frontend serving configured successfully');
  } else {
    console.log('⚠️  Frontend dist not found at:', frontendPath);
    
    // Fallback API response
    app.get('/', (req, res) => {
      res.json({ 
        message: 'HellverseChat API Server', 
        status: 'running',
        environment: process.env.NODE_ENV,
        isProduction,
        note: 'Frontend not built. Expected at: ' + frontendPath,
        frontendExists: fs.existsSync(frontendPath)
      });
    });
  }
} catch (error) {
  console.log('❌ Error checking frontend:', error.message);
  app.get('/', (req, res) => {
    res.json({ 
      message: 'HellverseChat API Server', 
      status: 'running',
      environment: process.env.NODE_ENV,
      isProduction,
      error: 'Frontend check failed: ' + error.message
    });
  });
}

// Health check endpoint for Railway/Docker
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Maintenance mode endpoint
app.get("/api/maintenance", (req, res) => {
  res.status(200).json({
    maintenanceMode: MAINTENANCE_MODE,
    message: MAINTENANCE_MESSAGE,
    eta: MAINTENANCE_ETA,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check environment
app.get("/api/debug-env", (req, res) => {
  res.status(200).json({
    NODE_ENV: process.env.NODE_ENV,
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS,
    hasResendKey: !!process.env.RESEND_API_KEY,
    port: process.env.PORT,
    isProduction: isProduction,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT,
    emailProvider: process.env.RESEND_API_KEY ? 'Resend' : 
                  (process.env.EMAIL_USER ? 'SMTP' : 'None')
  });
});

// Debug endpoint to test email sending
app.get("/api/test-email", async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Check for Resend first
    if (process.env.RESEND_API_KEY) {
      try {
        // Test Resend API connection
        const testResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'HellverseChat <onboarding@resend.dev>',
            to: ['test@example.com'],
            subject: 'Test Email',
            html: '<p>Test</p>'
          })
        });

        if (testResponse.status === 422) {
          // Expected for test email - means API key is valid
          return res.status(200).json({
            success: true,
            message: 'Resend API configuration is valid',
            provider: 'Resend',
            note: 'Ready for production emails'
          });
        }

        const result = await testResponse.json();
        return res.status(200).json({
          success: true,
          message: 'Resend API working',
          provider: 'Resend',
          result: result
        });

      } catch (error) {
        return res.status(500).json({
          success: false,
          error: `Resend API error: ${error.message}`,
          provider: 'Resend'
        });
      }
    }
    
    // Fallback to SMTP testing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({
        error: 'No email configuration found',
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        hasResendKey: !!process.env.RESEND_API_KEY,
        message: 'Configure either RESEND_API_KEY or EMAIL_USER/EMAIL_PASS'
      });
    }

    const emailConfig = getEmailConfig(process.env.EMAIL_USER);
    const transporter = nodemailer.createTransport(emailConfig);
    
    // Try to verify the connection
    await transporter.verify();
    
    res.status(200).json({
      success: true,
      message: 'SMTP configuration is valid',
      provider: 'SMTP',
      emailUser: process.env.EMAIL_USER,
      config: {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure
      }
    });
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      provider: 'SMTP',
      emailUser: process.env.EMAIL_USER
    });
  }
});

// Email verification endpoints
app.post("/api/signup-request", async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).send("Username, password, and email are required");
  }
  
  if (users.has(username)) {
    return res.status(409).send("Username already exists");
  }
  
  if (isBanned(username)) {
    return res.status(403).send("Username is banned");
  }
  
  // Check if email is already being used by an existing user
  for (const [existingUsername, userData] of users) {
    if (userData.email === email) {
      return res.status(409).send("Email already in use");
    }
  }
  
  try {
    console.log('📝 Starting signup process for:', { username, email });
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed successfully');
    
    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    console.log('🎲 Verification code generated:', code);
    
    // Store pending verification
    pendingVerifications.set(email, {
      username,
      passwordHash,
      email,
      code,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    console.log('💾 Pending verification stored');
    
    // Send verification email
    console.log('📧 Attempting to send verification email...');
    await sendVerificationEmail(email, code);
    console.log('📧 Verification email sent successfully');
    
    res.status(200).send("Verification code sent");
  } catch (error) {
    console.error('❌ Signup request error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).send("Failed to send verification code");
  }
});

app.post("/api/verify-account", async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }
  
  const pending = pendingVerifications.get(email);
  
  if (!pending) {
    return res.status(400).json({ message: "No pending verification found for this email" });
  }
  
  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(email);
    return res.status(400).json({ message: "Verification code expired" });
  }
  
  if (pending.code !== code) {
    return res.status(400).json({ message: "Invalid verification code" });
  }
  
  try {
    // Create the user account
    const userData = { 
      passwordHash: pending.passwordHash, 
      email: pending.email,
      isAdmin: isAdmin(pending.username),
      characters: new Map(),
      createdAt: pending.createdAt
    };
    
    users.set(pending.username, userData);
    saveData(); // Persist user data
    
    // Remove pending verification
    pendingVerifications.delete(email);
    
    // Generate JWT token
    const token = jwt.sign({ username: pending.username }, SECRET);
    
    res.json({ 
      token, 
      user: {
        username: pending.username, 
        email: userData.email,
        isAdmin: userData.isAdmin,
        characterCount: 0
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

app.post("/api/resend-code", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send("Email is required");
  }
  
  const pending = pendingVerifications.get(email);
  
  if (!pending) {
    return res.status(400).send("No pending verification found for this email");
  }
  
  try {
    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Update pending verification
    pending.code = code;
    pending.expiresAt = expiresAt;
    
    // Send new verification email
    await sendVerificationEmail(email, code);
    
    res.status(200).send("New verification code sent");
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).send("Failed to resend verification code");
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).send("missing");
  if (users.has(username)) return res.status(409).send("user exists");
  if (isBanned(username)) return res.status(403).send("banned");
  
  const hash = await bcrypt.hash(password, 10);
  const userData = { 
    passwordHash: hash, 
    email: email || '',
    isAdmin: isAdmin(username),
    characters: new Map(), // Store character IDs -> character data
    createdAt: new Date().toISOString()
  };
  users.set(username, userData);
  saveData(); // Persist user data
  
  const token = jwt.sign({ username }, SECRET);
  res.json({ 
    token, 
    username, 
    email: userData.email,
    isAdmin: userData.isAdmin,
    characterCount: 0
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users.get(username);
  if (!u) return res.status(401).send("invalid");
  if (isBanned(username)) return res.status(403).send("banned");
  
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).send("invalid");
  
  // Update admin status in case it changed
  u.isAdmin = isAdmin(username);
  
  const token = jwt.sign({ username }, SECRET);
  res.json({ 
    token, 
    username, 
    email: u.email,
    isAdmin: u.isAdmin,
    characterCount: u.characters.size,
    characters: Array.from(u.characters.values())
  });
});

// Character management endpoints
app.get("/api/characters", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    console.log('🔍 Looking for user:', payload.username);
    console.log('🔍 Available users:', Array.from(users.keys()));
    const user = users.get(payload.username);
    if (!user) {
      console.log('❌ User not found:', payload.username);
      return res.status(404).send("user not found");
    }
    
    res.json({ 
      characters: Array.from(user.characters.values()),
      characterCount: user.characters.size,
      maxCharacters: 150
    });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/api/characters", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    if (user.characters.size >= 150) {
      return res.status(400).send("character limit reached");
    }
    
    const { name, species, gender, age, description, preferences, status, nameColor, textColor, backgroundColor } = req.body;
    if (!name?.trim()) return res.status(400).send("character name required");
    
    const characterId = `${payload.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const character = {
      id: characterId,
      name: name.trim(),
      ownerId: payload.username,
      species: species || 'Human',
      gender: gender || 'Unspecified',
      age: age || 'Adult',
      description: description || '',
      preferences: preferences || '',
      status: status || 'Looking for RP',
      nameColor: nameColor || '#ff6b6b',
      textColor: textColor || '#ffffff',
      backgroundColor: backgroundColor || '#2c2c54',
      avatar: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    user.characters.set(characterId, character);
    characters.set(characterId, character);
    saveData(); // Persist character data
    
    res.json(character);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.put("/api/characters/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    const { id } = req.params;
    const character = user.characters.get(id);
    if (!character) return res.status(404).send("character not found");
    
    const { name, species, gender, age, description, preferences, status, nameColor, textColor, backgroundColor } = req.body;
    
    if (name !== undefined) character.name = name.trim() || character.name;
    if (species !== undefined) character.species = species;
    if (gender !== undefined) character.gender = gender;
    if (age !== undefined) character.age = age;
    if (description !== undefined) character.description = description;
    if (preferences !== undefined) character.preferences = preferences;
    if (status !== undefined) character.status = status;
    if (nameColor !== undefined) character.nameColor = nameColor;
    if (textColor !== undefined) character.textColor = textColor;
    if (backgroundColor !== undefined) character.backgroundColor = backgroundColor;
    
    character.updatedAt = new Date().toISOString();
    
    user.characters.set(id, character);
    characters.set(id, character);
    saveData(); // Persist character data
    
    res.json(character);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/api/characters/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    const { id } = req.params;
    const character = user.characters.get(id);
    if (!character) return res.status(404).send("character not found");
    
    user.characters.delete(id);
    characters.delete(id);
    saveData(); // Persist character data
    
    res.json({ success: true, message: "Character deleted" });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.get("/api/characters/:id", (req, res) => {
  const { id } = req.params;
  const character = characters.get(id);
  if (!character) return res.status(404).send("character not found");
  
  // Return public character info (no private data)
  res.json({
    id: character.id,
    name: character.name,
    species: character.species,
    gender: character.gender,
    age: character.age,
    description: character.description,
    status: character.status,
    nameColor: character.nameColor,
    textColor: character.textColor,
    backgroundColor: character.backgroundColor,
    avatar: character.avatar
  });
});

// Admin endpoints
app.post("/admin/ban", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { username } = req.body;
    if (!username) return res.status(400).send("username required");
    if (isAdmin(username)) return res.status(403).send("cannot ban admin");
    
    bannedUsers.add(username);
    
    // Disconnect banned user if online
    const socketId = socketsByUser.get(username);
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("banned", { reason: "You have been banned by an administrator" });
        socket.disconnect(true);
      }
    }
    
    res.json({ success: true, message: `User ${username} has been banned` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/admin/unban", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { username } = req.body;
    if (!username) return res.status(400).send("username required");
    
    bannedUsers.delete(username);
    res.json({ success: true, message: `User ${username} has been unbanned` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/admin/channel", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { name } = req.body;
    if (!name) return res.status(400).send("channel name required");
    
    channels.add(name.toLowerCase());
    io.emit("channel_created", { name: name.toLowerCase(), creator: payload.username });
    res.json({ success: true, message: `Channel #${name} created` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/admin/channel/:name", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { name } = req.params;
    if (name === "main") return res.status(400).send("cannot delete main channel");
    
    channels.delete(name);
    io.emit("channel_deleted", { name, deleter: payload.username });
    res.json({ success: true, message: `Channel #${name} deleted` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.get("/channels", (req, res) => {
  res.json({ channels: Array.from(channels) });
});

// News endpoints
app.get("/api/news", (req, res) => {
  const news = Array.from(newsArticles.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(news);
});

app.post("/api/news", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("title and content required");
    
    const newsId = Date.now().toString();
    const article = {
      id: newsId,
      title,
      content,
      author: adminUser.display || payload.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    newsArticles.set(newsId, article);
    
    // Broadcast new news to all connected users
    io.emit("news_update", { type: "created", article });
    
    res.json(article);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.put("/api/news/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { id } = req.params;
    const { title, content } = req.body;
    const article = newsArticles.get(id);
    
    if (!article) return res.status(404).send("news article not found");
    
    if (title) article.title = title;
    if (content) article.content = content;
    article.updatedAt = new Date().toISOString();
    
    newsArticles.set(id, article);
    
    // Broadcast news update to all connected users
    io.emit("news_update", { type: "updated", article });
    
    res.json(article);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/api/news/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { id } = req.params;
    const article = newsArticles.get(id);
    
    if (!article) return res.status(404).send("news article not found");
    
    newsArticles.delete(id);
    
    // Broadcast news deletion to all connected users
    io.emit("news_update", { type: "deleted", articleId: id });
    
    res.json({ success: true, message: "News article deleted" });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

// Catch-all handler for production: serve React app for any non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    res.sendFile(frontendPath);
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, { 
  cors: { 
    origin: CORS_ORIGIN,
    credentials: true
  } 
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const characterId = socket.handshake.auth?.characterId;
  if (!token) return next(new Error("auth required"));
  if (!characterId) return next(new Error("character selection required"));
  
  try {
    const payload = jwt.verify(token, SECRET);
    const character = characters.get(characterId);
    
    if (!character || character.ownerId !== payload.username) {
      return next(new Error("invalid character"));
    }
    
    socket.data.username = payload.username;
    socket.data.characterId = characterId;
    socket.data.character = character;
    return next();
  } catch (e) {
    return next(new Error("invalid token"));
  }
});

io.on("connection", (socket) => {
  const username = socket.data.username;
  const characterId = socket.data.characterId;
  const character = socket.data.character;
  const userData = users.get(username);
  
  if (isBanned(username)) {
    socket.emit("banned", { reason: "You are banned from this server" });
    socket.disconnect(true);
    return;
  }
  
  socketsByCharacter.set(characterId, socket.id);

  io.emit("presence", { 
    characterId,
    character: character,
    username: username,
    status: "online",
    isAdmin: userData?.isAdmin || false 
  });

  socket.join("main");

  // Send current channel list to new user
  socket.emit("channels_list", { channels: Array.from(channels) });

  socket.on("message", (payload) => {
    if (isBanned(username)) {
      socket.emit("banned", { reason: "You are banned from this server" });
      socket.disconnect(true);
      return;
    }
    
    const msg = {
      id: Date.now(),
      characterId: characterId,
      character: character,
      username: username,
      isAdmin: userData?.isAdmin || false,
      text: payload.text,
      messageType: payload.messageType || 'normal', // normal, emote, ooc
      ts: new Date().toISOString(),
    };
    io.to(payload.room || "main").emit("message", msg);
  });

  // Admin actions via socket
  socket.on("admin_ban", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { targetUser } = payload;
    if (isAdmin(targetUser)) return; // Cannot ban other admins
    
    bannedUsers.add(targetUser);
    
    // Disconnect all characters of banned user
    const targetUserData = users.get(targetUser);
    if (targetUserData) {
      for (const [charId, char] of targetUserData.characters) {
        const targetSocketId = socketsByCharacter.get(charId);
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("banned", { reason: `You have been banned by ${character.name}` });
            targetSocket.disconnect(true);
          }
        }
      }
    }
    
    io.emit("user_banned", { 
      username: targetUser, 
      bannedBy: character.name 
    });
  });

  socket.on("admin_create_channel", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { name } = payload;
    if (!name) return;
    
    const channelName = name.toLowerCase().trim();
    channels.add(channelName);
    io.emit("channel_created", { 
      name: channelName, 
      creator: character.name 
    });
  });

  socket.on("admin_delete_channel", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { name } = payload;
    if (!name || name === "main") return; // Cannot delete main channel
    
    channels.delete(name);
    io.emit("channel_deleted", { 
      name, 
      deleter: character.name 
    });
  });

  socket.on("typing", ({ room, typing }) => {
    socket.to(room || "main").emit("typing", { 
      characterId,
      character,
      typing 
    });
  });

  socket.on("join_room", ({ room }) => {
    // Leave all rooms except the socket's own room
    Array.from(socket.rooms).forEach(r => {
      if (r !== socket.id) {
        socket.leave(r);
      }
    });
    
    // Join the new room
    socket.join(room);
    console.log(`${character.name} (${username}) joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    socketsByCharacter.delete(characterId);
    io.emit("presence", { 
      characterId,
      character,
      username,
      status: "offline",
      isAdmin: userData?.isAdmin || false 
    });
  });
});

// SPA fallback route - MUST be after all API routes
if (fs.existsSync(path.join(__dirname, '../frontend/dist'))) {
  app.get('*', (req, res) => {
    // Only serve SPA for non-API routes
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/health') && !req.path.startsWith('/signup') && !req.path.startsWith('/login') && !req.path.startsWith('/profile')) {
      console.log('📄 Serving index.html for route:', req.path);
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
      // Let API routes handle themselves or return 404
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Periodic save every 5 minutes
setInterval(() => {
  saveData();
}, 5 * 60 * 1000);

// Save data on process exit
process.on('SIGINT', () => {
  console.log('\n💾 Saving data before exit...');
  saveData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n💾 Saving data before termination...');
  saveData();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces at port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://[your-ip]:${PORT}`);
});
