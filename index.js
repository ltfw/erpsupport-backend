const express = require('express');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const persediaanRoutes = require('./routes/persediaan');
const penjualanRoutes = require('./routes/penjualan');
const departmentsRoutes = require('./routes/department');
const supplierRoutes = require('./routes/supplier');
const lainLainRoutes = require('./routes/tools/others');
const navigationsRoutes = require('./routes/navigations');
const rayoncabangRoutes = require('./routes/reports/rayoncabang');
const daftarBarangRoutes = require('./routes/reports/daftarbarang');
const konfirmasiPiutangRoutes = require('./routes/piutang/konfirmasipiutang');
const authenticateToken = require('./middleware/auth');

const adminNavigationRoutes = require('./routes/admin/navigation'); // Import admin navigation routes
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const allowedOrigins = [
  'http://localhost:3000', // For local development on the same machine
  'http://10.252.198.100:3000', // Your frontend's network IP and port
  'http://10.252.22.20',
  'http://localhost',
  'https://erpsupport.sdlindonesia.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    // or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Define allowed methods
  credentials: true, // Allow sending cookies/authorization headers
  optionsSuccessStatus: 204 // For preflight requests
}));

app.use('/auth', authRoutes);
app.use('/customers',authenticateToken, customerRoutes)
app.use('/sales', authenticateToken, penjualanRoutes);
app.use('/stocks',authenticateToken, persediaanRoutes);
app.use('/departments',authenticateToken, departmentsRoutes);
app.use('/suppliers', authenticateToken, supplierRoutes);
app.use('/navigations', authenticateToken, navigationsRoutes);
app.use('/report/rayoncabang', authenticateToken, rayoncabangRoutes);
app.use('/report/daftarbarang', authenticateToken, daftarBarangRoutes);
app.use('/piutang/konfirmasipiutang', authenticateToken, konfirmasiPiutangRoutes);
app.use('/others', lainLainRoutes);

app.use('/admin/navigations', authenticateToken, adminNavigationRoutes);

// Example protected route
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Hello, you are authorized', user: req.user });
});

app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0'; 

app.listen(port, host, () => {
  console.log(`Express server running at http://${host}:${port}`);
  if (host === '0.0.0.0') {
    // On 0.0.0.0, it's often helpful to also log the local IP for easy access
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'Unknown';
    for (const devName in networkInterfaces) {
      const iface = networkInterfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
      if (localIp !== 'Unknown') break;
    }
    console.log(`Access on your network at: http://${localIp}:${port}`);
  }
});
