// Login page script
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');
  
  // Demo account handlers
  document.querySelectorAll('.demo-account').forEach(account => {
    account.addEventListener('click', () => {
      const email = account.dataset.email;
      const password = account.dataset.password;
      emailInput.value = email;
      passwordInput.value = password;
      emailInput.focus();
    });
  });
  
  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    // Disable button during login
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    hideError();
    
    try {
      // Simulate authentication (in real app, this would be an API call)
      const result = await authenticateUser(email, password);
      
      if (result.success) {
        // Store user session
        await chrome.storage.local.set({
          user: {
            email: result.email,
            role: result.role,
            name: result.name,
            loggedIn: true,
            loginTime: Date.now()
          }
        });
        
        // Redirect based on role
        if (result.role === 'admin') {
          // Admin goes to full dashboard
          window.location.href = chrome.runtime.getURL('extension/popup/admin.html');
        } else {
          // Regular user goes to history view only
          window.location.href = chrome.runtime.getURL('extension/popup/admin.html') + '?tab=history';
        }
      } else {
        showError(result.message || 'Invalid email or password');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Login failed. Please try again.');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
  }
  
  function hideError() {
    errorMessage.classList.remove('show');
  }
});

// Demo authentication function
async function authenticateUser(email, password) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Demo accounts
  const demoAccounts = {
    'user@demo.com': {
      password: 'user123',
      role: 'user',
      name: 'Demo User'
    },
    'admin@demo.com': {
      password: 'admin123',
      role: 'admin',
      name: 'Admin User'
    }
  };
  
  const account = demoAccounts[email.toLowerCase()];
  
  if (account && account.password === password) {
    return {
      success: true,
      email: email,
      role: account.role,
      name: account.name
    };
  }
  
  // In a real app, you would check against Firebase/backend here
  // For now, any other credentials will fail
  return {
    success: false,
    message: 'Invalid email or password. Try the demo accounts below.'
  };
}
