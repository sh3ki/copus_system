// debug-admin-create.js
const axios = require('axios');

async function testAdminCreateAdmin() {
    try {
        // Login as admin
        console.log('Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:3000/login', {
            employee: 'EMP002',
            password: 'password123'
        }, {
            maxRedirects: 0,
            validateStatus: () => true
        });
        
        const cookies = loginResponse.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
        console.log('Cookies:', cookies);
        
        // Try to create admin account
        console.log('\nAttempting to create admin account...');
        const createResponse = await axios.post('http://localhost:3000/add_employee', {
            employeeId: 'EMP999',
            department: 'IT',
            lastname: 'Test',
            firstname: 'Admin',
            role: 'admin',
            email: 'testadmin999@example.com',
            dean: 'Test',
            yearHired: '2024'
        }, {
            headers: { Cookie: cookies },
            validateStatus: () => true
        });
        
        console.log('Status:', createResponse.status);
        console.log('Data:', createResponse.data);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testAdminCreateAdmin();
