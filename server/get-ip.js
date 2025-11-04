import { networkInterfaces } from 'os';

function getLocalIP() {
    const nets = networkInterfaces();
    const result = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!result[name]) {
                    result[name] = [];
                }
                result[name].push(net.address);
            }
        }
    }
    return result;
}

const interfaces = getLocalIP();
const PORT = process.env.PORT || 4000;

console.log('🌐 Your chat server can be accessed at:');
console.log(`📍 Local: http://localhost:${PORT}`);

for (const [name, addresses] of Object.entries(interfaces)) {
    addresses.forEach(address => {
        console.log(`🔗 Network (${name}): http://${address}:${PORT}`);
        console.log(`   Share this link: http://${address}:${PORT}`);
    });
}

console.log('\n💡 Share the network link with others to let them join your chat!');