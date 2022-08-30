# SQL Transactions

Lecture starter code - server code only.

## Setup

Create database `bank` and run database.sql file.

```
npm install
npm start
```

Transactions are a way to ensure that multiple db queries happen as intended. If one fails, they all fail so we don't get out of sick warnings

Atomicity - a transaction must be fully complete and saved or undone/ rolled back.