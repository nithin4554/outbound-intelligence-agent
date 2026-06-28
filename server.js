import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'results.json');

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Serve frontend build output in production
app.use(express.static(path.join(__dirname, 'docs')));

// API: Get current results
app.get('/api/results', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data file.' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse JSON database.' });
    }
  });
});

// API: Update lead status
app.post('/api/status', (req, res) => {
  const { companyId, status } = req.body;
  if (!companyId || !status) {
    return res.status(400).json({ error: 'Missing companyId or status.' });
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read database.' });
    
    try {
      const db = JSON.parse(data);
      const company = db.companies.find(c => c.id === companyId);
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found.' });
      }
      
      company.status = status;
      company.lastUpdated = new Date().toISOString();
      
      fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).json({ error: 'Failed to save status.' });
        res.json({ success: true, company });
      });
    } catch (e) {
      res.status(500).json({ error: 'Database update failed.' });
    }
  });
});

// API: Update lead notes
app.post('/api/notes', (req, res) => {
  const { companyId, notes } = req.body;
  if (!companyId && notes === undefined) {
    return res.status(400).json({ error: 'Missing companyId or notes.' });
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read database.' });
    
    try {
      const db = JSON.parse(data);
      const company = db.companies.find(c => c.id === companyId);
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found.' });
      }
      
      company.notes = notes;
      company.lastUpdated = new Date().toISOString();
      
      fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).json({ error: 'Failed to save notes.' });
        res.json({ success: true, company });
      });
    } catch (e) {
      res.status(500).json({ error: 'Database update failed.' });
    }
  });
});

// API: Edit template messages
app.post('/api/message', (req, res) => {
  const { companyId, name, field, value } = req.body;
  if (!companyId || !name || !field || value === undefined) {
    return res.status(400).json({ error: 'Missing parameters.' });
  }

  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read database.' });
    
    try {
      const db = JSON.parse(data);
      const person = db.people.find(p => p.companyId === companyId && p.name === name);
      
      if (!person) {
        return res.status(404).json({ error: 'Person not found.' });
      }
      
      if (['connectionNote', 'firstDM', 'followUpDM'].includes(field)) {
        person[field] = value;
        
        fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), (writeErr) => {
          if (writeErr) return res.status(500).json({ error: 'Failed to save message edits.' });
          res.json({ success: true, person });
        });
      } else {
        res.status(400).json({ error: 'Invalid message field.' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Database update failed.' });
    }
  });
});

// API: Manually trigger run-agent
app.post('/api/run-agent', (req, res) => {
  console.log('Running agent.py trigger...');
  const pythonCmd = process.platform === 'win32' ? 'python agent.py' : 'python3 agent.py';
  
  exec(pythonCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        stderr: stderr 
      });
    }
    
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    
    res.json({ 
      success: true, 
      stdout: stdout,
      stderr: stderr
    });
  });
});

// Serve frontend routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Outbound Agent server running on http://localhost:${PORT}`);
});
