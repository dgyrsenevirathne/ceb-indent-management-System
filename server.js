// Import required modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('msnodesqlv8'); // For SQL Server connection

const app = express();
app.use(cors()); // Enable CORS
app.use(bodyParser.json());


// Redirect root URL to dashboard.html
app.get('/', (req, res) => {
    console.log('Redirecting to dashboard.html'); // Debug log
    res.redirect('/dashboard.html'); // Redirect to dashboard.html
});

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
    if (!data.indentNo) errors.push('Indent No is required.');
    if (!data.currency) errors.push('Currency is required.');
    if (!data.date) errors.push('Date is required.');
    if (data.baseValue < 0) errors.push('Base Value must be a positive number.');
    if (data.harringAndTransport < 0) errors.push('Harring and Transport must be a positive number.');
    if (data.vat < 0) errors.push('VAT must be a positive number.');
    if (data.nat < 0) errors.push('NAT must be a positive number.');
    if (data.advance < 0) errors.push('Advance must be a positive number.');
    if (data.reimbursement < 0) errors.push('Reimbursement must be a positive number.');
    if (data.commission < 0) errors.push('Commission must be a positive number.');
    return errors;
};

app.post('/add-indent', async (req, res) => {
    try {
        const {
            indentNo, currency, baseValue, harringAndTransport,
            vat, nat, advance, reimbursement, commission, complexRef, item, supplier,
            date // Add the date field
        } = req.body;

        // Trim spaces from the incoming data
        const trimmedData = {
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
            supplier: supplier ? supplier.trim() : null,
            date: date // Add the date field
        };

        // Validate input data
        const validationErrors = validateIndentData(trimmedData);
        if (validationErrors.length > 0) {
            return res.status(400).send({ errors: validationErrors });
        }

        // Check if the record already exists (including deleted records)
        const checkQuery = `
            SELECT COUNT(*) AS count 
            FROM [IndentManagement].[dbo].[IndentDetails] 
            WHERE [IndentNo] = ? AND [ComplexRef] = ?
        `;
        const checkResult = await executeQuery(sqlConfig.connectionString, checkQuery, [trimmedData.indentNo, trimmedData.complexRef]);

        if (checkResult[0]?.count > 0) {
            // If the record exists, update it to restore it
            const updateQuery = `
                UPDATE [IndentManagement].[dbo].[IndentDetails] 
                SET [Currency] = ?, [BaseValue] = ?, [HarringAndTransport] = ?, 
                    [VAT] = ?, [NAT] = ?, [Advance] = ?, [Reimbursement] = ?, 
                    [Commission] = ?, [ComplexRef] = ?, [Item] = ?, [Supplier] = ?, [Date] = ?, [IsDeleted] = 0
                WHERE [IndentNo] = ? AND [ComplexRef] = ?
            `;
            await executeQuery(sqlConfig.connectionString, updateQuery, [
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
                trimmedData.date,
                trimmedData.indentNo,
                trimmedData.complexRef
            ]);
            return res.status(200).send({ message: 'Indent restored successfully!' });
        }

        // Insert new record if it does not exist
        const insertQuery = `
            INSERT INTO [IndentManagement].[dbo].[IndentDetails] 
            ([IndentNo], [Currency], [BaseValue], [HarringAndTransport], 
            [VAT], [NAT], [Advance], [Reimbursement], [Commission], 
            [ComplexRef], [Item], [Supplier], [Date], [CreatedAt])
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        `;
        await executeQuery(sqlConfig.connectionString, insertQuery, [
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
            trimmedData.date,
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
        const { page = 1, limit = 1000, searchTerm = '' } = req.query;
        const offset = (page - 1) * limit;
        const searchQuery = `%${searchTerm}%`;

        const query = `
    SELECT * FROM [IndentManagement].[dbo].[IndentDetails]
    WHERE [IsDeleted] = 0 AND CONCAT(IndentNo, Item, Supplier, Date) LIKE ?
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

app.get('/get-deleted-indents', async (req, res) => {
    try {
        const query = `
            SELECT * FROM [IndentManagement].[dbo].[IndentDetails]
            WHERE [IsDeleted] = 1
        `;
        const results = await executeQuery(sqlConfig.connectionString, query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching deleted indents:', err);
        res.status(500).json({ message: 'Error fetching deleted indents' });
    }
});

// Update an indent
app.put('/update-indent/:indentNo', async (req, res) => {
    try {
        const indentNo = req.params.indentNo;
        const {
            currency, baseValue, harringAndTransport, vat, nat,
            advance, reimbursement, commission, complexRef, item, supplier,
            date // Add the date field
        } = req.body;

        // Trim the complex reference
        const trimmedIndentNo = indentNo.trim();
        const trimmedComplexRef = complexRef.trim();

        // Log the values being used for the update
        console.log('Updating indent with values:', {
            currency, baseValue, harringAndTransport, vat, nat,
            advance, reimbursement, commission, trimmedComplexRef, item, supplier, trimmedIndentNo, trimmedComplexRef, date
        });

        // Update the existing record
        const updateQuery = `
         UPDATE [IndentManagement].[dbo].[IndentDetails] SET
            [Currency] = ?, [BaseValue] = ?, [HarringAndTransport] = ?, 
             [VAT] = ?, [NAT] = ?, [Advance] = ?, [Reimbursement] = ?, 
             [Commission] = ?, [ComplexRef] = ?, [Item] = ?, [Supplier] = ?, [Date] = ?, [IsDeleted] = 0
         WHERE [IndentNo] = ? AND [ComplexRef] = ? AND [IsDeleted] = 0
     `;
        // Wrap the execution in a try-catch block
        try {
            const result = await executeQuery(sqlConfig.connectionString, updateQuery, [
                currency, baseValue, harringAndTransport, vat, nat,
                advance, reimbursement, commission, complexRef, item, supplier, date, indentNo, complexRef
            ]);
            console.log('Update result:', result); // Log the result of the update
        } catch (error) {
            console.error('Error executing update query:', error);
            return res.status(500).json({ message: 'Failed to update indent', error: error.message });
        }

        res.json({ message: 'Indent updated successfully' });
    } catch (err) {
        console.error('Error updating indent:', err);
        res.status(500).json({ message: 'Failed to update indent' });
    }
});

// Delete an indent (soft delete)
app.delete('/delete-indent/:indentNo', async (req, res) => {
    try {
        const indentNo = req.params.indentNo.trim(); // Trim the indent number

        // Log the indent number received
        console.log(`Received request to delete indent: ${indentNo}`);

        // Check if the record exists before marking as deleted
        const checkQuery = 'SELECT COUNT(*) AS count FROM [IndentManagement].[dbo].[IndentDetails] WHERE [IndentNo] = ? AND [IsDeleted] = 0';
        const checkResult = await executeQuery(sqlConfig.connectionString, checkQuery, [indentNo]);

        // Log the check result
        console.log(`Check result for indent ${indentNo}:`, checkResult);

        // If the indent does not exist, return a 404 response
        if (checkResult[0].count === 0) {
            console.warn(`Indent not found: ${indentNo}`);
            return res.status(404).json({ message: 'Indent not found' });
        }

        // SQL query to mark the indent as deleted
        const query = 'UPDATE [IndentManagement].[dbo].[IndentDetails] SET [IsDeleted] = 1 WHERE [IndentNo] = ?';
        console.log(`Executing query: ${query} with parameters: ${[indentNo]}`);

        const result = await executeQuery(sqlConfig.connectionString, query, [indentNo]);

        // Log the result to see what is returned
        console.log('Soft delete result:', result);

        // Check if the indent was found and marked as deleted
        if (result && result.rowsAffected && result.rowsAffected[0] === 0) {
            console.warn(`Indent not found during deletion: ${indentNo}`);
            return res.status(404).json({ message: 'Indent not found' });
        }

        // Return success response
        res.json({ message: 'Indent marked as deleted successfully' });
    } catch (err) {
        console.error('Error deleting indent:', err);
        res.status(500).json({ message: 'Failed to delete indent', error: err.message });
    }
});

app.post('/update-conversion-rate', async (req, res) => {
    try {
        const { currency, conversionRate } = req.body;

        // SQL query to update the conversion rate
        const updateQuery = `
            UPDATE [IndentManagement].[dbo].[CurrencyConversionRates]
            SET [ConversionRate] = ?
            WHERE [Currency] = ?
        `;

        const result = await executeQuery(sqlConfig.connectionString, updateQuery, [conversionRate, currency]);
        console.log('Update result:', result); // Log the result for debugging

        // Check if rowsAffected is defined and has the expected structure
        if (result && result.rowsAffected && result.rowsAffected.length > 0 && result.rowsAffected[0] === 0) {
            console.warn(`Currency not found: ${currency}`);
            return res.status(404).send({ message: 'Currency not found' });
        }

        res.status(200).send({ message: 'Conversion rate updated successfully' });
    } catch (error) {
        console.error('Error updating conversion rate:', error);
        res.status(500).send({ error: 'An error occurred while updating the conversion rate' });
    }
});

// Fetch conversion rates
app.get('/get-conversion-rates', async (req, res) => {
    try {
        const query = 'SELECT Currency, ConversionRate FROM [IndentManagement].[dbo].[CurrencyConversionRates]';
        const results = await executeQuery(sqlConfig.connectionString, query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching conversion rates:', error);
        res.status(500).send({ error: 'Failed to fetch conversion rates' });
    }
});

// Fetch suppliers from the database
app.get('/get-suppliers', async (req, res) => {
    try {
        const query = 'SELECT SupplierID, SupplierName FROM Suppliers';
        const results = await executeQuery(sqlConfig.connectionString, query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Fetch supplier name from the database
app.post('/get-supplier-name', async (req, res) => {
    try {
        const { SupplierID } = req.body;
        const query = 'SELECT SupplierName FROM Suppliers WHERE SupplierID = ?';
        const result = await executeQuery(sqlConfig.connectionString, query, [SupplierID]);
        res.json(result[0].SupplierName);
    } catch (error) {
        console.error('Error fetching supplier name:', error);
        res.status(500).json({ error: 'Failed to fetch supplier name' });
    }
});

// Add new currency
app.post('/add-currency', async (req, res) => {
    try {
        const { newCurrency, newConversionRate } = req.body;

        // SQL query to insert new currency
        const insertQuery = `
            INSERT INTO [IndentManagement].[dbo].[CurrencyConversionRates]
            ([Currency], [ConversionRate])
            VALUES (?, ?)
        `;
        await executeQuery(sqlConfig.connectionString, insertQuery, [newCurrency, newConversionRate]);

        res.status(201).send({ message: 'New currency added successfully!' });
    } catch (err) {
        console.error('Error adding new currency:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Fetch suppliers from the database
app.get('/get-suppliers', async (req, res) => {
    try {
        const query = 'SELECT SupplierID, SupplierName FROM Suppliers';
        const results = await executeQuery(sqlConfig.connectionString, query);
        res.json(results);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Fetch next supplier ID
app.get('/get-next-supplier-id', async (req, res) => {
    try {
        const query = 'SELECT MAX ([SupplierID]) + 1 AS nextID FROM [IndentManagement].[dbo].[Suppliers]';
        const result = await executeQuery(sqlConfig.connectionString, query);
        res.json({ nextID: result[0].nextID });
    } catch (error) {
        console.error('Error fetching next supplier ID:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint to add a new supplier
app.post('/add-supplier', async (req, res) => {
    const { supplierID, supplierName } = req.body;
    try {
        const query = 'INSERT INTO [IndentManagement].[dbo].[Suppliers] (SupplierID, SupplierName) VALUES (?, ?)';
        await executeQuery(sqlConfig.connectionString, query, [supplierID, supplierName]);
        res.status(201).json({ message: 'Supplier added successfully' });
    } catch (error) {
        console.error('Error adding supplier:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint to delete a supplier
app.delete('/delete-supplier', async (req, res) => {
    const { supplierID } = req.body;
    try {
        const query = 'DELETE FROM [IndentManagement].[dbo].[Suppliers] WHERE SupplierID = ?';
        await executeQuery(sqlConfig.connectionString, query, [supplierID]);
        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint to get a supplier by ID
app.get('/get-supplier/:supplierID', async (req, res) => {
    const supplierID = req.params.supplierID;
    try {
        const query = 'SELECT * FROM [IndentManagement].[dbo].[Suppliers] WHERE SupplierID = ?';
        const result = await executeQuery(sqlConfig.connectionString, query, [parseInt(supplierID)]);
        res.json(result[0]);
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint to update a supplier
app.put('/update-supplier/:supplierID', async (req, res) => {
    const supplierID = req.params.supplierID;
    const { supplierName } = req.body;
    try {
        const query = 'UPDATE [IndentManagement].[dbo].[Suppliers] SET SupplierName = ? WHERE SupplierID = ?';
        await executeQuery(sqlConfig.connectionString, query, [supplierName, supplierID]);
        res.status(200).json({ message: 'Supplier updated successfully' });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).send('Server error');
    }
});


// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
