/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api';

// Login aegis admin user
router.post('/login', [
  body('userId').trim().notEmpty(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Forward login request to backend
    const response = await axios.post(`${API_BASE_URL}/aegis-admin/login`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Store token and user info in session
    const token = response.data.result?.token || response.data.token;
    const userInfo = response.data.result?.user || response.data.user;
    
    if (token && userInfo) {
      // Ensure session exists
      if (!req.session) {
        console.error('[Login] ERROR: req.session is null!');
        return res.status(500).json({ message: 'Session initialization failed' });
      }
      
      // Touch session to ensure it's initialized
      req.session.touch();
      
      // Store token in session
      req.session.token = token;
      req.session.authenticated = true;
      req.session.authenticatedAt = new Date().toISOString();
      
      // Store ALL user info including role in session
      req.session.user = {
        userId: userInfo.userId || userInfo.UserId,
        aegisUserId: userInfo.aegisUserId || userInfo.AegisUserId,
        firstName: userInfo.firstName || userInfo.FirstName,
        lastName: userInfo.lastName || userInfo.LastName,
        phone: userInfo.phone || userInfo.Phone,
        role: userInfo.role || userInfo.Role, // Store role in session
        isActive: userInfo.isActive || userInfo.IsActive,
        lastLogin: userInfo.lastLogin || userInfo.LastLogin,
        createdAt: userInfo.createdAt || userInfo.CreatedAt
      };
      
      console.log('[Login] ✅ Token and user info stored in session:', {
        userId: req.session.user.userId,
        role: req.session.user.role,
        aegisUserId: req.session.user.aegisUserId
      });
      
      // Mark session as modified
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('[Login] Error saving session:', err);
          return res.status(500).json({ message: 'Failed to save session' });
        }
        console.log('[Login] ✅ Session saved with token and user info');
      });
    }
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('[Login] Error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ 
      message: 'Server error during login' 
    });
  }
});

// Get current user profile from session
router.get('/profile', (req, res) => {
  try {
    // Check if session has token and user info
    if (!req.session?.token || !req.session?.user) {
      return res.status(401).json({ 
        message: 'Not authenticated',
        error: 'No session found'
      });
    }
    
    // Return user info from session (no need to call backend)
    return res.status(200).json({
      result: {
        user: req.session.user
      }
    });
  } catch (error) {
    console.error('[Profile] Error:', error.message);
    return res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

// Logout - clear session
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('[Logout] Error destroying session:', err);
          return res.status(500).json({ message: 'Failed to logout' });
        }
        console.log('[Logout] ✅ Session destroyed');
        return res.status(200).json({ message: 'Logged out successfully' });
      });
    } else {
      return res.status(200).json({ message: 'Already logged out' });
    }
  } catch (error) {
    console.error('[Logout] Error:', error.message);
    return res.status(500).json({ 
      message: 'Server error during logout' 
    });
  }
});

// Register new aegis admin user
router.post('/register', [
  body('userId').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').optional().isIn(['agent', 'admin', 'mainadmin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Forward register request to backend
    const response = await axios.post(`${API_BASE_URL}/aegis-admin/register`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Store token and user info in session (same as login)
    const token = response.data.result?.token || response.data.token;
    const userInfo = response.data.result?.user || response.data.user;
    
    if (token && userInfo) {
      if (!req.session) {
        console.error('[Register] ERROR: req.session is null!');
        return res.status(500).json({ message: 'Session initialization failed' });
      }
      
      req.session.touch();
      req.session.token = token;
      req.session.authenticated = true;
      req.session.authenticatedAt = new Date().toISOString();
      
      req.session.user = {
        userId: userInfo.userId || userInfo.UserId,
        aegisUserId: userInfo.aegisUserId || userInfo.AegisUserId,
        firstName: userInfo.firstName || userInfo.FirstName,
        lastName: userInfo.lastName || userInfo.LastName,
        phone: userInfo.phone || userInfo.Phone,
        role: userInfo.role || userInfo.Role, // Store role in session
        isActive: userInfo.isActive || userInfo.IsActive,
        lastLogin: userInfo.lastLogin || userInfo.LastLogin,
        createdAt: userInfo.createdAt || userInfo.CreatedAt
      };
      
      console.log('[Register] ✅ Token and user info stored in session');
      
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
      req.session.save((err) => {
        if (err) {
          console.error('[Register] Error saving session:', err);
        }
      });
    }
    
    return res.status(201).json(response.data);
  } catch (error) {
    console.error('[Register] Error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ 
      message: 'Server error during registration' 
    });
  }
});

module.exports = router;

