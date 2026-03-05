const fs = require('fs');
const path = require('path');
const AuditLogger = require('../../src/security/audit-logger');
const cryptoUtils = require('../../src/security/crypto-utils');

async function run(runner) {
    console.log('\n🔒 Testing Audit Logger');

    const testDir = path.join(__dirname, '../../test-audit-logs');
    const testFile = path.join(testDir, 'audit.log');
    const secretKey = 'test-secret-key';

    // Helper to setup
    const setup = () => {
        // Ensure clean state
        if (fs.existsSync(testDir)) {
             try {
                fs.rmSync(testDir, { recursive: true, force: true });
             } catch (e) {}
        }
        return new AuditLogger(testFile, secretKey);
    };

    // Test 1: Create log file if it does not exist
    {
        const logger = setup();
        logger.log({ id: 1 }, 'test', {});
        runner.assert(fs.existsSync(testFile), 'log file created');
    }

    // Test 2: Append log entries
    {
        const logger = setup();
        logger.log({ id: 1 }, 'action1', {});
        logger.log({ id: 2 }, 'action2', {});
        const content = fs.readFileSync(testFile, 'utf8').trim().split('\n');
        runner.assert(content.length === 2, 'appends log entries');
    }

    // Test 3: Include all fields and signature
    {
        const logger = setup();
        const user = { id: 123, username: 'admin' };
        const action = 'sh';
        const details = { command: 'ls' };
        
        logger.log(user, action, details);
        
        const content = fs.readFileSync(testFile, 'utf8').trim();
        const entry = JSON.parse(content);
        
        runner.assert(!!entry.timestamp, 'timestamp included');
        runner.assert(entry.user.id === 123, 'user id matches');
        runner.assert(entry.action === action, 'action matches');
        runner.assert(entry.details.command === 'ls', 'details match');
        runner.assert(!!entry.signature, 'signature included');
    }

    // Test 4: Verify signature matches manual calculation
    {
        const logger = setup();
        const user = { id: 123, username: 'admin' };
        const action = 'sh';
        const details = { command: 'ls' };
        
        logger.log(user, action, details);
        
        const content = fs.readFileSync(testFile, 'utf8').trim();
        const entry = JSON.parse(content);
        
        const signature = entry.signature;
        
        // Re-calculate signature manually to verify
        // Must match implementation: checkEntry = { timestamp, user, action, details }
        const checkEntry = {
            timestamp: entry.timestamp,
            user: entry.user,
            action: entry.action,
            details: entry.details
        };
        const payload = JSON.stringify(checkEntry);
        const expectedSignature = cryptoUtils.hmacSha256(secretKey, payload).toString('hex');
        
        runner.assert(signature === expectedSignature, 'signature matches expected calculation');
    }

    // Test 5: verifyEntry method success
    {
        const logger = setup();
        logger.log({ id: 1 }, 'action', {});
        const content = fs.readFileSync(testFile, 'utf8').trim();
        const entry = JSON.parse(content);
        runner.assert(logger.verifyEntry(entry) === true, 'verifyEntry returns true for valid entry');
    }

    // Test 6: verifyEntry fail on tamper
    {
        const logger = setup();
        logger.log({ id: 1 }, 'action', { cmd: 'ls' });
        const content = fs.readFileSync(testFile, 'utf8').trim();
        let entry = JSON.parse(content);
        
        // Tamper
        entry.details.cmd = 'rm -rf /';
        
        runner.assert(logger.verifyEntry(entry) === false, 'verifyEntry returns false for tampered entry');
    }

    // Test 7: Secret key required
    {
        try {
            new AuditLogger(testFile, null);
            runner.assert(false, 'should throw if secret key is missing');
        } catch (e) {
            runner.assert(e.message.includes('Secret key is required'), 'throws correct error for missing secret key');
        }
    }
    
    // Cleanup
    if (fs.existsSync(testDir)) {
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

module.exports = { run };
