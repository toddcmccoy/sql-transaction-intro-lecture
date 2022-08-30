const express = require('express');
const router = express.Router();
const pool = require('../modules/pool.js');

// Setup a GET route to get all the accounts & balances
router.get('/', (req, res) => {
  const sqlText = `SELECT account.name, SUM(amount) FROM account 
                      JOIN register on account.id=acct_id
                      GROUP BY account.id ORDER BY account.name;`;
  pool.query(sqlText)
      .then((result) => {
          console.log(`Got account balances:`, result.rows);
          res.send(result.rows);
      })
      .catch((error) => {
          console.log(`Error making database query ${sqlText}`, error);
          res.sendStatus(500); // Good server always responds
      })
});

// Setup route for money transfer 
// Need *async* function to *await* completion of each query
router.post('/transfer', async (req, res) => {
  const toId = req.body.toId;
  const fromId = req.body.fromId;
  const amount = req.body.amount;
  console.log(`Transfer ${amount} from acct ${fromId} to acct ${toId}`);

  // We need to use the same connection for all queries...
  const connection = await pool.connect()
    
  // Using basic JavaScript try/catch/finally 
  try {
    await connection.query('BEGIN');
    const sqlText = `INSERT INTO register (acct_id, amount) VALUES ($1, $2)`;
    // Use - amount & from account for withdraw
    await connection.query( sqlText, [fromId, -amount]);
    // Use + amount & to account for deposit
    await connection.query( sqlText, [toId, amount]);        
    await connection.query('COMMIT');
    res.sendStatus(200); 
  } catch ( error ) {
    await connection.query('ROLLBACK');
    console.log(`Transaction Error - Rolling back transfer`, error);
    res.sendStatus(500); 
  } finally {
    // Always runs - both after successful try & after catch
    // Put the client connection back in the pool
    // This is super important! 
    connection.release()
  }
});

// Setup route for new account with balance
router.post('/', async (req, res) => {
  const name = req.body.name;
  const amount = req.body.amount;
  console.log(`Creating new account '${name}' with initial balance ${amount}`);

  const connection = await pool.connect()    
  try {
    await connection.query('BEGIN');
    const sqlAddAccount = `INSERT INTO account (name) VALUES ($1) RETURNING id`;
    // Save the result so we can get the returned value
    const result = await connection.query( sqlAddAccount, [name]); 
    // Get the id from the result - will have 1 row with the id 
    const accountId = result.rows[0].id; 
    const sqlInitialDeposit = `INSERT INTO register (acct_id, amount) VALUES ($1, $2);`  
    await connection.query( sqlInitialDeposit, [accountId, amount]); 
    await connection.query('COMMIT');
    res.sendStatus(200); 
  } catch ( error ) {
    await connection.query('ROLLBACK');
    console.log(`Transaction Error - Rolling back new account`, error);
    res.sendStatus(500); 
  } finally {
    connection.release()
  }
});

module.exports = router;
