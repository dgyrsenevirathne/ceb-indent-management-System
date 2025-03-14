// Fetch supplier data from the database
fetch('/get-suppliers')
    .then(response => response.json())
    .then(data => {
        const supplierTableBody = document.getElementById('supplierTableBody');
        supplierTableBody.innerHTML = ''; // Clear existing rows

        data.forEach(supplier => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supplier.SupplierID}</td>
                <td>${supplier.SupplierName}</td>
            `;
            supplierTableBody.appendChild(row);
        });
    })
    .catch(error => console.error('Error fetching suppliers:', error));

// Fetch supplier data from the database
fetch('/get-suppliers')
    .then(response => response.json())
    .then(data => {
        const supplierSelect = document.getElementById('supplier');
        data.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.SupplierID;
            option.text = supplier.SupplierName;
            supplierSelect.appendChild(option);
        });
    })
    .catch(error => console.error('Error fetching suppliers:', error));