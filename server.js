// Import required modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('msnodesqlv8'); // For SQL Server connection

const app = express();
app.use(cors()); // Enable CORS
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the "public" directory

// SQL Server connection configuration
const sqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=MSI\\SQLEXPRESS;Database=IndentManagement;Trusted_Connection=yes;',
};

// Helper function to execute SQL queries
const executeQuery = (connectionString, query, params) => {
    return new Promise((resolve, reject) => {
        sql.query(connectionString, query, params, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return reject(err);
            }
            resolve(result);
        });
    });
};

// Helper function to validate indent data
const validateIndentData = (data) => {
    const errors = [];
    if (!data.month) errors.push('Month is required.');
    if (!data.indentNo) errors.push('Indent No is required.');
    if (!data.currency) errors.push('Currency is required.');
    if (data.baseValue < 0) errors.push('Base Value must be a positive number.');
    if (data.harringAndTransport < 0) errors.push('Harring and Transport must be a positive number.');
    if (data.vat < 0) errors.push('VAT must be a positive number.');
    if (data.nat < 0) errors.push('NAT must be a positive number.');
    if (data.advance < 0) errors.push('Advance must be a positive number.');
    if (data.reimbursement < 0) errors.push('Reimbursement must be a positive number.');
    if (data.commission < 0) errors.push('Commission must be a positive number.');
    return errors;
};

// Add a new indent
app.post('/add-indent', async (req, res) => {
    try {
        const {
            month, indentNo, currency, baseValue, harringAndTransport,
            vat, nat, advance, reimbursement, commission, complexRef, item, supplier,
        } = req.body;

        // Trim spaces from the incoming data
        const trimmedData = {
            month: month.trim(),
            indentNo: indentNo.trim(),
            currency: currency.trim(),
            baseValue: parseFloat(baseValue) || 0,
            harringAndTransport: parseFloat(harringAndTransport) || 0,
            vat: parseFloat(vat) || 0,
            nat: parseFloat(nat) || 0,
            advance: parseFloat(advance) || 0,
            reimbursement: parseFloat(reimbursement) || 0,
            commission: parseFloat(commission) || 0,
            complexRef: complexRef ? complexRef.trim() : null,
            item: item ? item.trim() : null,
            supplier: supplier ? supplier.trim() : null
        };

        // Validate input data
        const validationErrors = validateIndentData(trimmedData);
        if (validationErrors.length > 0) {
            return res.status(400).send({ errors: validationErrors });
        }

        // Check if the record already exists
        const checkQuery = `
            SELECT COUNT(*) AS count 
            FROM [IndentManagement].[dbo].[IndentDetails] 
            WHERE [IndentNo] = ?
        `;
        const checkResult = await executeQuery(sqlConfig.connectionString, checkQuery, [trimmedData.indentNo]);

        if (checkResult[0]?.count > 0) {
            return res.status(400).send({ error: 'Record with this IndentNo already exists.' });
        }

        // Insert new record
        const insertQuery = `
            INSERT INTO [IndentManagement].[dbo].[IndentDetails] 
            ([Month], [IndentNo], [Currency], [BaseValue], [HarringAndTransport], 
            [VAT], [NAT], [Advance], [Reimbursement], [Commission], 
            [ComplexRef], [Item], [Supplier])
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await executeQuery(sqlConfig.connectionString, insertQuery, [
            trimmedData.month,
            trimmedData.indentNo,
            trimmedData.currency,
            trimmedData.baseValue,
            trimmedData.harringAndTransport,
            trimmedData.vat,
            trimmedData.nat,
            trimmedData.advance,
            trimmedData.reimbursement,
            trimmedData.commission,
            trimmedData.complexRef,
            trimmedData.item,
            trimmedData.supplier,
        ]);

        res.status(201).send({ message: 'Indent added successfully!' });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Fetch all indents with pagination and search
app.get('/get-indents', async (req, res) => {
    try {
        const { page = 1, limit = 10, searchTerm = '' } = req.query;
        const offset = (page - 1) * limit;
        const searchQuery = `%${searchTerm}%`;

        const query = `
            SELECT * FROM [IndentManagement].[dbo].[IndentDetails]
            WHERE CONCAT(IndentNo, Month, Item, Supplier) LIKE ?
            ORDER BY [IndentNo] OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        `;
        const results = await executeQuery(sqlConfig.connectionString, query, [searchQuery, offset, limit]);
        res.json(results);
    } catch (err) {
        console.error('Error fetching indents:', err);
        res.status(500).json({ message: 'Error fetching indents' });
    }
});

// Fetch a specific indent by IndentNo
app.get('/get-indents/:indentNo', async (req, res) => {
    try {
        const indentNo = req.params.indentNo.trim(); // Trim spaces from the indent number
        const query = `
            SELECT * 
            FROM [IndentManagement].[dbo].[IndentDetails] 
            WHERE [IndentNo] = ?
        `;
        const result = await executeQuery(sqlConfig.connectionString, query, [indentNo]);

        if (result.length === 0) {
            return res.status(404).send({ message: 'Indent not found' });
        }

        res.json(result[0]); // Return the first matching indent
    } catch (err) {
        console.error('Error fetching indent:', err);
        res.status(500).send({ error: 'Failed to fetch indent details' });
    }
});

// Update an indent
app.put('/update-indent/:indentNo', async (req, res) => {
    try {
        const indentNo = req.params.indentNo;
        const {
            month, currency, baseValue, harringAndTransport, vat, nat,
            advance, reimbursement, commission, complexRef, item, supplier,
        } = req.body;

        const query = `
            UPDATE [IndentManagement].[dbo].[IndentDetails] SET
                [Month] = ?, [Currency] = ?, [BaseValue] = ?, [HarringAndTransport] = ?, 
                [VAT] = ?, [NAT] = ?, [Advance] = ?, [Reimbursement] = ?, 
                [Commission] = ?, [ComplexRef] = ?, [Item] = ?, [Supplier] = ?
            WHERE [IndentNo] = ?
        `;
        await executeQuery(sqlConfig.connectionString, query, [
            month, currency, baseValue, harringAndTransport, vat, nat,
            advance, reimbursement, commission, complexRef, item, supplier, indentNo,
        ]);

        res.json({ message: 'Indent updated successfully' });
    } catch (err) {
        console.error('Error updating indent:', err);
        res.status(500).json({ message: 'Failed to update indent' });
    }
});

// Delete an indent
app.delete('/delete-indent/:indentNo', async (req, res) => {
    try {
        const indentNo = req.params.indentNo.trim(); // Trim the indent number

        // Log the indent number received
        console.log(`Received request to delete indent: ${indentNo}`);

        // Check if the record exists before deleting
        const checkQuery = 'SELECT COUNT(*) AS count FROM [IndentManagement].[dbo].[IndentDetails] WHERE [IndentNo] = ?';
        const checkResult = await executeQuery(sqlConfig.connectionString, checkQuery, [indentNo]);

        // Log the check result
        console.log(`Check result for indent ${indentNo}:`, checkResult);

        // If the indent does not exist, return a 404 response
        if (checkResult[0].count === 0) {
            console.warn(`Indent not found: ${indentNo}`);
            return res.status(404).json({ message: 'Indent not found' });
        }

        // SQL query to delete the indent
        const query = 'DELETE FROM [IndentManagement].[dbo].[IndentDetails] WHERE [IndentNo] = ?';
        console.log(`Executing query: ${query} with parameters: ${[indentNo]}`);

        const result = await executeQuery(sqlConfig.connectionString, query, [indentNo]);

        // Log the result to see what is returned
        console.log('Delete result:', result);

        // Check if the indent was found and deleted
        if (result && result.rowsAffected && result.rowsAffected[0] === 0) {
            console.warn(`Indent not found during deletion: ${indentNo}`);
            return res.status(404).json({ message: 'Indent not found' });
        }

        // Return success response
        res.json({ message: 'Indent deleted successfully' });
    } catch (err) {
        console.error('Error deleting indent:', err);
        res.status(500).json({ message: 'Failed to delete indent', error: err.message });
    }
});


// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
