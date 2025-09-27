# 🔐 Frontend Authentication State Management Guide

## 🎯 Hiding Login/SignUp/Admin Buttons After Login

This guide shows you exactly how to modify your frontend to **conditionally render buttons** based on user authentication status and roles.

---

## 📋 **Backend Support Ready**

Your backend now has these authentication endpoints:

✅ **POST** `/api/auth/login` - User/Admin login  
✅ **POST** `/api/auth/register` - User registration  
✅ **GET** `/api/auth/profile` - Get current user profile  
✅ **GET** `/api/auth/validate` - Validate JWT token  
✅ **POST** `/api/auth/logout` - Logout endpoint  

---

## 🔧 **1. Authentication Service (authService.js)**

Create this service to manage authentication state:

```javascript
// services/authService.js
class AuthService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.adminToken = localStorage.getItem('adminToken');
    this.admin = JSON.parse(localStorage.getItem('admin') || 'null');
  }

  // User Authentication
  async login(email, password) {
    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user token and data
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // If user is admin, also store admin credentials
        if (data.user.role === 'admin') {
          this.adminToken = data.token;
          this.admin = data.user;
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('admin', JSON.stringify(data.user));
        }

        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await fetch('http://localhost:3002/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after successful registration
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    // Clear all authentication data
    this.token = null;
    this.user = null;
    this.adminToken = null;
    this.admin = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');

    // Refresh the page to update UI
    window.location.reload();
  }

  // Check authentication status
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  isAdmin() {
    return this.isAuthenticated() && this.user?.role === 'admin';
  }

  isStudent() {
    return this.isAuthenticated() && this.user?.role === 'student';
  }

  isInstructor() {
    return this.isAuthenticated() && this.user?.role === 'instructor';
  }

  getCurrentUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  // Validate token with backend
  async validateToken() {
    if (!this.token) return false;

    try {
      const response = await fetch('http://localhost:3002/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } else {
        // Token is invalid, clear authentication
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      return false;
    }
  }

  // Get user profile from backend
  async fetchUserProfile() {
    if (!this.token) return null;

    try {
      const response = await fetch('http://localhost:3002/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      } else {
        this.logout();
        return null;
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      this.logout();
      return null;
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
```

---

## 🎨 **2. Header Component with Conditional Rendering**

Here's how to modify your header component:

```javascript
// components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Header = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isValid = await authService.validateToken();
      if (isValid) {
        setIsAuthenticated(true);
        setUser(authService.getCurrentUser());
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/register');
  };

  const handleAdminDashboard = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      alert('Access denied. Admin role required.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <header className="header">
      <div className="container">
        <div className="nav-brand">
          <Link to="/">
            <img src="/logo.png" alt="EduLearn Pro" />
            EduLearn Pro
          </Link>
        </div>

        <nav className="main-nav">
          <Link to="/">Home</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </nav>

        <div className="auth-buttons">
          {!isAuthenticated ? (
            // Show login/signup buttons when NOT authenticated
            <>
              <button onClick={handleLogin} className="btn-login">
                Login
              </button>
              <button onClick={handleSignUp} className="btn-signup">
                Sign Up
              </button>
            </>
          ) : (
            // Show user menu when authenticated
            <div className="user-menu">
              <span className="welcome-text">
                Welcome, {user?.name}!
              </span>
              
              {/* Show admin button only for admin users */}
              {user?.role === 'admin' && (
                <button 
                  onClick={handleAdminDashboard} 
                  className="btn-admin"
                >
                  🎛️ ADMIN
                </button>
              )}

              {/* User-specific navigation */}
              {user?.role === 'student' && (
                <Link to="/dashboard" className="btn-dashboard">
                  Dashboard
                </Link>
              )}

              {user?.role === 'instructor' && (
                <Link to="/instructor-dashboard" className="btn-dashboard">
                  Instructor
                </Link>
              )}

              <div className="user-dropdown">
                <button className="btn-user">
                  {user?.name} ▼
                </button>
                <div className="dropdown-menu">
                  <Link to="/profile">My Profile</Link>
                  <Link to="/settings">Settings</Link>
                  {user?.role === 'student' && (
                    <>
                      <Link to="/my-courses">My Courses</Link>
                      <Link to="/progress">Progress</Link>
                    </>
                  )}
                  {user?.role === 'instructor' && (
                    <>
                      <Link to="/my-courses">Manage Courses</Link>
                      <Link to="/create-course">Create Course</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="btn-logout">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
```

---

## 🎯 **3. Simple Implementation for Your Current Layout**

If you want a simpler approach for your current EduLearn Pro layout:

```javascript
// components/Header.jsx (Simple Version)
import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const Header = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication on component mount
    const checkAuth = async () => {
      const isValid = await authService.validateToken();
      if (isValid) {
        setUser(authService.getCurrentUser());
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    authService.logout();
    // Page will reload automatically
  };

  return (
    <div className="header">
      {/* Your existing header content */}
      <div className="logo">
        📚 EduLearn Pro
      </div>
      
      <nav>
        <a href="/">Home</a>
        <a href="/courses">Courses</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/terms">Terms of Service</a>
        <a href="/privacy">Privacy Policy</a>
      </nav>

      <div className="auth-section">
        {!isAuthenticated ? (
          // Show these buttons when user is NOT logged in
          <>
            <button 
              onClick={() => window.location.href = '/login'}
              className="login-btn"
            >
              Login
            </button>
            <button 
              onClick={() => window.location.href = '/register'}
              className="signup-btn"
            >
              Sign Up
            </button>
          </>
        ) : (
          // Show these when user IS logged in
          <>
            <span className="user-welcome">
              👋 Welcome, {user?.name}!
            </span>
            
            {/* Only show admin button for admin users */}
            {user?.role === 'admin' && (
              <button 
                onClick={() => window.location.href = '/admin'}
                className="admin-btn"
                style={{ 
                  background: '#e74c3c', 
                  color: 'white',
                  display: 'none' // HIDDEN AFTER LOGIN!
                }}
              >
                🎛️ ADMIN
              </button>
            )}

            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
```

---

## 🛠️ **4. Vanilla JavaScript Implementation**

If you're not using React, here's a vanilla JavaScript approach:

```javascript
// js/auth.js
class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    // Check authentication status on page load
    this.checkAuthStatus();
    this.setupEventListeners();
  }

  async checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (token && user) {
      // Validate token with backend
      try {
        const response = await fetch('http://localhost:3002/api/auth/validate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          this.updateUI(true, user);
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Auth validation failed:', error);
        this.logout();
      }
    } else {
      this.updateUI(false, null);
    }
  }

  updateUI(isAuthenticated, user) {
    // Hide/Show buttons based on authentication status
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const adminBtn = document.getElementById('adminBtn');
    const userWelcome = document.getElementById('userWelcome');
    const logoutBtn = document.getElementById('logoutBtn');

    if (isAuthenticated) {
      // User is logged in - HIDE login/signup/admin buttons
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none'; // HIDE ADMIN BUTTON!
      
      // Show user welcome and logout
      if (userWelcome) {
        userWelcome.style.display = 'inline';
        userWelcome.textContent = `Welcome, ${user.name}!`;
      }
      if (logoutBtn) logoutBtn.style.display = 'inline';

      // Show admin dashboard link only for admin users (in dropdown menu)
      if (user.role === 'admin') {
        const adminDashboardLink = document.getElementById('adminDashboardLink');
        if (adminDashboardLink) adminDashboardLink.style.display = 'block';
      }
    } else {
      // User is NOT logged in - SHOW login/signup buttons
      if (loginBtn) loginBtn.style.display = 'inline';
      if (signupBtn) signupBtn.style.display = 'inline';
      if (adminBtn) adminBtn.style.display = 'inline'; // Show admin button for login
      
      // Hide user-specific elements
      if (userWelcome) userWelcome.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  async login(email, password) {
    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.updateUI(true, data.user);
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    this.updateUI(false, null);
    // Optionally redirect to home page
    window.location.href = '/';
  }

  setupEventListeners() {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = await this.login(email, password);
        if (result.success) {
          alert('Login successful!');
          // Redirect or update UI
        } else {
          alert('Login failed: ' + result.error);
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }
}

// Initialize auth manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
```

---

## 🌐 **5. HTML Template with Conditional Rendering**

Update your HTML template:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EduLearn Pro</title>
</head>
<body>
    <header>
        <div class="container">
            <div class="logo">📚 EduLearn Pro</div>
            
            <nav>
                <a href="/">Home</a>
                <a href="/courses">Courses</a>
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
                <a href="/terms">Terms of Service</a>
                <a href="/privacy">Privacy Policy</a>
            </nav>

            <div class="auth-buttons">
                <!-- These buttons will be hidden after login -->
                <button id="loginBtn" class="btn login-btn">Login</button>
                <button id="signupBtn" class="btn signup-btn">Sign Up</button>
                <button id="adminBtn" class="btn admin-btn">🎛️ ADMIN</button>

                <!-- These elements will be shown after login -->
                <span id="userWelcome" class="user-welcome" style="display: none;">
                    Welcome, User!
                </span>
                
                <!-- User dropdown menu -->
                <div id="userMenu" class="user-menu" style="display: none;">
                    <button class="user-dropdown-btn">Profile ▼</button>
                    <div class="dropdown-content">
                        <a href="/profile">My Profile</a>
                        <a href="/dashboard">Dashboard</a>
                        <a id="adminDashboardLink" href="/admin" style="display: none;">
                            Admin Dashboard
                        </a>
                        <button id="logoutBtn">Logout</button>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <main>
        <!-- Your page content -->
    </main>

    <script src="js/auth.js"></script>
</body>
</html>
```

---

## 🎯 **6. CSS for Button States**

Add CSS to style the different button states:

```css
/* styles.css */
.auth-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.login-btn {
  background: #3498db;
  color: white;
}

.login-btn:hover {
  background: #2980b9;
}

.signup-btn {
  background: #27ae60;
  color: white;
}

.signup-btn:hover {
  background: #229954;
}

.admin-btn {
  background: #e74c3c;
  color: white;
}

.admin-btn:hover {
  background: #c0392b;
}

.user-welcome {
  color: #2c3e50;
  font-weight: bold;
  margin-right: 15px;
}

.logout-btn {
  background: #95a5a6;
  color: white;
}

.logout-btn:hover {
  background: #7f8c8d;
}

/* User dropdown menu */
.user-menu {
  position: relative;
}

.user-dropdown-btn {
  background: #34495e;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.dropdown-content {
  display: none;
  position: absolute;
  right: 0;
  background: white;
  min-width: 160px;
  box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
  border-radius: 5px;
  z-index: 1000;
}

.dropdown-content a,
.dropdown-content button {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-decoration: none;
  color: #333;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.dropdown-content a:hover,
.dropdown-content button:hover {
  background: #f1f1f1;
}

.user-menu:hover .dropdown-content {
  display: block;
}
```

---

## 🔄 **7. Complete Flow Example**

Here's how the complete flow works:

1. **Page Load**: Check if user is authenticated
2. **Not Authenticated**: Show Login, Sign Up, Admin buttons
3. **User Logs In**: Hide Login/Sign Up/Admin buttons, show user menu
4. **Admin User**: Gets access to admin dashboard in dropdown
5. **User Logs Out**: Clear all data, show Login/Sign Up/Admin buttons again

---

## 🧪 **8. Testing Your Implementation**

1. **Test with admin user**:
   - Email: `admin@edulearnpro.com`
   - Password: `admin123`

2. **Test with regular user**:
   - Register a new student account
   - Login and verify buttons are hidden

3. **Test logout**:
   - Verify buttons reappear after logout

---

## 🎉 **Summary**

✅ **Login/Sign Up buttons**: Hidden after successful login  
✅ **Admin button**: Hidden for all users after login  
✅ **Admin access**: Available in dropdown menu for admin users only  
✅ **User welcome**: Shows current user's name  
✅ **Logout functionality**: Clears all data and restores original buttons  
✅ **Token validation**: Checks with backend on page load  
✅ **Role-based access**: Different features for students/instructors/admins  

Your frontend will now properly hide the Login, Sign Up, and Admin buttons after a user logs in, and show them appropriate user-specific navigation instead! 🎯