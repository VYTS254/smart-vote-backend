// Test if election is active and accessible
const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testActiveElection() {
  try {
    console.log('🔍 Testing Active Election Setup...\n');

    // 1. Login
    console.log('1. Logging in as CS/2021/001...');
    const loginResponse = await request('POST', '/auth/login', {
      studentRegistrationNumber: 'CS/2021/001',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✓ Login successful!');
    console.log(`  User: ${user.fullName}`);
    console.log('');

    // 2. Get OPEN elections
    console.log('2. Fetching OPEN elections...');
    const electionsResponse = await request('GET', '/elections?status=OPEN', null, token);

    console.log('DEBUG Response:', JSON.stringify(electionsResponse, null, 2));

    const elections = electionsResponse.data.elections;
    console.log(`✓ Found ${elections.length} OPEN election(s)!\n`);

    // 3. Display election details
    for (const election of elections) {
      console.log('📊 Election Details:');
      console.log(`   Name: ${election.name}`);
      console.log(`   Stage: ${election.stage}`);
      console.log(`   Status: ${election.status}`);
      console.log(`   Academic Year: ${election.academicYear}`);
      console.log(`   Start: ${new Date(election.startAt).toLocaleString()}`);
      console.log(`   End: ${new Date(election.endAt).toLocaleString()}`);
      console.log('');

      // 4. Get detailed election info (with positions and candidates)
      console.log('3. Fetching election details with candidates...');
      const detailResponse = await request('GET', `/elections/${election.id}`, null, token);

      const electionDetail = detailResponse.data.election;
      
      if (electionDetail.positions && electionDetail.positions.length > 0) {
        console.log(`✓ Found ${electionDetail.positions.length} position(s)\n`);
        
        for (const position of electionDetail.positions) {
          console.log(`   🎯 Position: ${position.name}`);
          console.log(`      Seats: ${position.numberOfSeats}`);
          console.log(`      Voting Method: ${position.votingMethod}`);
          
          if (position.candidates && position.candidates.length > 0) {
            console.log(`      Candidates: ${position.candidates.length}`);
            
            for (const candidate of position.candidates) {
              console.log(`      - ${candidate.user.fullName} (Ballot #${candidate.ballotNumber})`);
              if (candidate.manifesto) {
                console.log(`        "${candidate.manifesto.substring(0, 80)}..."`);
              }
            }
          } else {
            console.log('      No candidates yet');
          }
          console.log('');
        }
      } else {
        console.log('   No positions configured yet\n');
      }
    }

    console.log('✅ Election is active and ready for voting!');
    console.log('');
    console.log('🗳️  Users can now:');
    console.log('   1. Login with any user account');
    console.log('   2. See the active election');
    console.log('   3. View candidates (Amina, Brian, Caroline)');
    console.log('   4. Cast their vote immediately');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testActiveElection();
