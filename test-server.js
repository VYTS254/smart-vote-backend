// Quick test to see if server starts without database
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is working!' });
});

const PORT = 3050;
app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  setTimeout(() => {
    console.log('\n✅ Server test successful! Press Ctrl+C to stop.');
  }, 1000);
});
