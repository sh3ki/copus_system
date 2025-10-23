// test-user-management.js
// Automated test for user management add and edit functionality

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test credentials
const SUPER_ADMIN_CREDS = { employee: 'EMP001', password: 'password123' };
const ADMIN_CREDS = { employee: 'EMP002', password: 'password123' };

let superAdminCookies = '';
let adminCookies = '';

// Helper function to extract cookies
function extractCookies(response) {
    const cookies = response.headers['set-cookie'];
    if (cookies) {
        return cookies.map(cookie => cookie.split(';')[0]).join('; ');
    }
    return '';
}

// Helper function to login
async function login(credentials) {
    console.log(`\n🔐 Logging in as ${credentials.employee}...`);
    try {
        const response = await axios.post(`${BASE_URL}/login`, credentials, {
            maxRedirects: 0,
            validateStatus: (status) => status < 400
        });
        const cookies = extractCookies(response);
        console.log(`✅ Login successful for ${credentials.employee}`);
        return cookies;
    } catch (error) {
        console.error(`❌ Login failed for ${credentials.employee}:`, error.message);
        throw error;
    }
}

// Test creating user
async function testCreateUser(cookies, userData, shouldSucceed = true) {
    console.log(`\n📝 Testing user creation: ${userData.employeeId} (${userData.role})...`);
    try {
        const response = await axios.post(`${BASE_URL}/add_employee`, userData, {
            headers: { Cookie: cookies },
            validateStatus: (status) => status < 500
        });
        
        if (shouldSucceed) {
            if (response.status === 200 || response.status === 302) {
                console.log(`✅ Successfully created user ${userData.employeeId} with role ${userData.role}`);
                return true;
            } else {
                console.error(`❌ Expected success but got status ${response.status}`);
                console.error('Response:', response.data);
                return false;
            }
        } else {
            if (response.status === 403 || response.status === 400) {
                console.log(`✅ Correctly rejected creating ${userData.role} (status: ${response.status})`);
                return true;
            } else {
                console.error(`❌ Expected rejection but got status ${response.status}`);
                return false;
            }
        }
    } catch (error) {
        if (!shouldSucceed && (error.response?.status === 403 || error.response?.status === 400)) {
            console.log(`✅ Correctly rejected creating ${userData.role} (status: ${error.response.status})`);
            console.log(`   Message: ${error.response.data.error || 'Access denied'}`);
            return true;
        }
        console.error(`❌ Error creating user ${userData.employeeId}:`, error.response?.data || error.message);
        return false;
    }
}

// Test editing user
async function testEditUser(cookies, employeeId, updateData) {
    console.log(`\n✏️ Testing user edit: ${employeeId}...`);
    try {
        const response = await axios.post(`${BASE_URL}/update_user`, updateData, {
            headers: { Cookie: cookies },
            validateStatus: (status) => status < 500
        });
        
        if (response.status === 200 || response.status === 302) {
            console.log(`✅ Successfully updated user ${employeeId}`);
            return true;
        } else {
            console.error(`❌ Failed to update user ${employeeId}, status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating user ${employeeId}:`, error.response?.data || error.message);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting User Management Tests...\n');
    console.log('=' .repeat(60));
    
    let passedTests = 0;
    let failedTests = 0;
    
    try {
        // Login as Super Admin
        superAdminCookies = await login(SUPER_ADMIN_CREDS);
        
        // Login as Admin
        adminCookies = await login(ADMIN_CREDS);
        
        console.log('\n' + '='.repeat(60));
        console.log('PART 1: SUPER ADMIN - TESTING USER CREATION');
        console.log('='.repeat(60));
        
        // Super Admin - Test creating admin role
        if (await testCreateUser(superAdminCookies, {
            employeeId: 'EMP101',
            department: 'IT Department',
            lastname: 'TestAdmin',
            firstname: 'Super',
            middleInitial: 'A',
            role: 'admin',
            email: 'testadmin@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Super Admin - Test creating Faculty role
        if (await testCreateUser(superAdminCookies, {
            employeeId: 'EMP102',
            department: 'CIT Department',
            lastname: 'TestFaculty',
            firstname: 'Super',
            middleInitial: 'B',
            role: 'Faculty',
            email: 'testfaculty@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Super Admin - Test creating Observer (ALC) role
        if (await testCreateUser(superAdminCookies, {
            employeeId: 'EMP103',
            department: 'Active Learning Center',
            lastname: 'TestObserverALC',
            firstname: 'Super',
            middleInitial: 'C',
            role: 'Observer (ALC)',
            email: 'testobserveralc@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Super Admin - Test creating Observer (SLC) role
        if (await testCreateUser(superAdminCookies, {
            employeeId: 'EMP104',
            department: 'Student Learning Center',
            lastname: 'TestObserverSLC',
            firstname: 'Super',
            middleInitial: 'D',
            role: 'Observer (SLC)',
            email: 'testobserverslc@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        console.log('\n' + '='.repeat(60));
        console.log('PART 2: ADMIN - TESTING USER CREATION');
        console.log('='.repeat(60));
        
        // Admin - Test creating Faculty role (should succeed)
        if (await testCreateUser(adminCookies, {
            employeeId: 'EMP201',
            department: 'CIT Department',
            lastname: 'TestFaculty2',
            firstname: 'Admin',
            middleInitial: 'A',
            role: 'Faculty',
            email: 'testfaculty2@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Admin - Test creating Observer (ALC) role (should succeed)
        if (await testCreateUser(adminCookies, {
            employeeId: 'EMP202',
            department: 'Active Learning Center',
            lastname: 'TestObserverALC2',
            firstname: 'Admin',
            middleInitial: 'B',
            role: 'Observer (ALC)',
            email: 'testobserveralc2@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Admin - Test creating Observer (SLC) role (should succeed)
        if (await testCreateUser(adminCookies, {
            employeeId: 'EMP203',
            department: 'Student Learning Center',
            lastname: 'TestObserverSLC2',
            firstname: 'Admin',
            middleInitial: 'C',
            role: 'Observer (SLC)',
            email: 'testobserverslc2@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, true)) passedTests++; else failedTests++;
        
        // Admin - Test creating admin role (should FAIL)
        if (await testCreateUser(adminCookies, {
            employeeId: 'EMP204',
            department: 'IT Department',
            lastname: 'TestAdminFail',
            firstname: 'Admin',
            middleInitial: 'D',
            role: 'admin',
            email: 'testadminfail@example.com',
            dean: 'Dr. Test',
            yearHired: '2024'
        }, false)) passedTests++; else failedTests++;
        
        console.log('\n' + '='.repeat(60));
        console.log('PART 3: SUPER ADMIN - TESTING USER EDIT');
        console.log('='.repeat(60));
        
        // Super Admin - Test editing a user
        if (await testEditUser(superAdminCookies, 'EMP003', {
            employeeId: 'EMP003',
            department: 'CIT Department - Updated',
            lastname: 'Garcia',
            firstname: 'Leo',
            middleInitial: 'C',
            role: 'Faculty',
            email: 'leo.garcia@example.com',
            dean: 'Dr. Maria Rodriguez - Updated',
            assignedProgramHead: 'Prof. Carlos Mendez - Updated',
            yearsTeachingPhinmaEd: '6',
            yearHired: '2020',
            yearRegularized: '2022',
            highestEdAttainment: 'PhD in Computer Science',
            profLicense: 'Licensed Professional Teacher',
            employmentStatus: 'Regular',
            rank: 'Assistant Professor'
        })) passedTests++; else failedTests++;
        
        console.log('\n' + '='.repeat(60));
        console.log('PART 4: ADMIN - TESTING USER EDIT');
        console.log('='.repeat(60));
        
        // Admin - Test editing a user
        if (await testEditUser(adminCookies, 'EMP004', {
            employeeId: 'EMP004',
            department: 'Active Learning Center - Updated',
            lastname: 'Cruz',
            firstname: 'Pedro',
            middleInitial: 'D',
            role: 'Observer (ALC)',
            email: 'pedro.cruz@example.com',
            dean: 'Dr. Maria Rodriguez - Updated',
            assignedProgramHead: 'Prof. Carlos Mendez - Updated',
            yearsTeachingPhinmaEd: '4',
            yearHired: '2022',
            yearRegularized: '2024',
            highestEdAttainment: 'Masters in Education',
            profLicense: 'Licensed Professional Teacher',
            employmentStatus: 'Regular',
            rank: 'Senior Observer'
        })) passedTests++; else failedTests++;
        
        // Final results
        console.log('\n' + '='.repeat(60));
        console.log('TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`📊 Total: ${passedTests + failedTests}`);
        console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
        console.log('='.repeat(60));
        
        if (failedTests === 0) {
            console.log('\n🎉 ALL TESTS PASSED! User management is fully functional!');
        } else {
            console.log(`\n⚠️ ${failedTests} test(s) failed. Please review the errors above.`);
        }
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests().then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
});
