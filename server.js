
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Generic Handler for "Document Store" style tables
const createJsonHandler = (tableName) => {
    const router = express.Router();

    // GET ALL
    router.get('/', async (req, res) => {
        try {
            const [rows] = await pool.query(`SELECT data FROM ${tableName}`);
            const items = rows.map(row => (typeof row.data === 'string' ? JSON.parse(row.data) : row.data));
            res.json(items);
        } catch (error) {
            // console.error(`Error fetching ${tableName}:`, error);
            // Fallback for initial setup or connection issues
            res.status(500).json({ error: error.message });
        }
    });

    // BATCH UPDATE / SYNC
    router.post('/', async (req, res) => {
        const items = Array.isArray(req.body) ? req.body : [req.body];
        if (items.length === 0) return res.json({ success: true });

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            // Simple Upsert strategy
            for (const item of items) {
                if (!item.id) continue;
                await connection.query(
                    `INSERT INTO ${tableName} (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
                    [item.id, JSON.stringify(item), JSON.stringify(item)]
                );
            }
            await connection.commit();
            res.json({ success: true });
        } catch (error) {
            await connection.rollback();
            console.error(`Error saving to ${tableName}:`, error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    });

    // DELETE
    router.delete('/:id', async (req, res) => {
        try {
            await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

// Singleton Handler (Garage Info, Settings)
const createSingletonHandler = (tableName, recordId) => {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const [rows] = await pool.query(`SELECT data FROM ${tableName} WHERE id = ?`, [recordId]);
            if (rows.length > 0) {
                res.json(typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data);
            } else {
                res.json(null);
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            await pool.query(
                `INSERT INTO ${tableName} (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
                [recordId, JSON.stringify(req.body), JSON.stringify(req.body)]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

// Define Routes
app.use('/api/estimates', createJsonHandler('estimates'));
app.use('/api/stock', createJsonHandler('stock_items'));
app.use('/api/mechanics', createJsonHandler('mechanics'));
app.use('/api/appointments', createJsonHandler('appointments'));
app.use('/api/users', createJsonHandler('users'));
app.use('/api/promotions', createJsonHandler('promotions'));
app.use('/api/suppliers', createJsonHandler('suppliers'));
app.use('/api/orders', createJsonHandler('purchase_orders'));
app.use('/api/labor', createJsonHandler('predefined_labor'));
app.use('/api/kits', createJsonHandler('job_kits'));
app.use('/api/bays', createJsonHandler('workshop_bays'));

// Singletons
app.use('/api/garage-info', createSingletonHandler('app_settings', 'garage_info'));
app.use('/api/loyalty-config', createSingletonHandler('app_settings', 'loyalty_config'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`NPC Garage Backend running on port ${PORT}`);
});
