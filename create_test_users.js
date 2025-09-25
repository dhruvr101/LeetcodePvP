import axios from 'axios';

async function createTestUsers() {
    console.log('🧪 Creating test users...');

    const users = [
        { email: 'host@example.com', password: 'password123' },
        { email: 'player@example.com', password: 'password123' }
    ];

    for (const user of users) {
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/auth/signup', {
                email: user.email,
                password: user.password
            });
            console.log(`✅ Created user: ${user.email}`);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`👤 User already exists: ${user.email}`);
            } else {
                console.log(`❌ Error creating ${user.email}:`, error.message);
            }
        }
    }

    console.log('\n📋 Test Instructions:');
    console.log('1. Open two DIFFERENT browsers (Chrome + Firefox) OR use incognito');
    console.log('2. Browser 1: Login with host@example.com / password123');
    console.log('3. Browser 2: Login with player@example.com / password123');
    console.log('4. Test room creation and joining!');
}

createTestUsers();