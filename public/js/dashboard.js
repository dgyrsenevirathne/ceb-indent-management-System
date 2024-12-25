let currentPage = 1;
const recordsPerPage = 10; // Number of records to display per page
let allIndents = []; // Store all indents for filtering and pagination

// Debounce function to limit the rate at which a function can fire
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Search and filter functionality
const filterIndents = () => {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase(); // Trim spaces and convert to lowercase
    const filteredIndents = allIndents.filter(indent => {
        const indentNo = indent.IndentNo ? indent.IndentNo.toLowerCase().trim() : '';
        return indentNo.includes(searchTerm) || (indent.Supplier && indent.Supplier.toLowerCase().includes(searchTerm));
    });
    displayIndents(filteredIndents, 1); // Reset to first page
    setupPagination(filteredIndents.length);
};

// Use debounce to limit the filter function calls
const debouncedFilterIndents = debounce(filterIndents, 300); // 300ms delay

document.getElementById('filterButton').addEventListener('click', function () {
    // Clear the search input field
    document.getElementById('searchInput').value = '';
    // Call the debounced filter function
    debouncedFilterIndents();
});
document.getElementById('searchInput').addEventListener('input', debouncedFilterIndents); // Call filter on input

// Export to Excel functionality
document.getElementById('exportExcelButton').addEventListener('click', function () {
    exportToExcel(allIndents); // Use the allIndents array to export
});


// Function to display indents based on the current page
function displayIndents(indents, page) {
    const tableBody = document.getElementById('indentTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    const startIndex = (page - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, indents.length);

    for (let i = startIndex; i < endIndex; i++) {
        const indent = indents[i];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${indent.Year}</td> 
            <td>${indent.Month}</td>
            <td>${indent.IndentNo}</td>
            <td>${indent.Currency}</td>
            <td>${indent.BaseValue}</td>
            <td>${indent.HarringAndTransport}</td>
            <td>${indent.VAT}</td>
            <td>${indent.NAT}</td>
            <td>${indent.Advance}</td>
            <td>${indent.Reimbursement}</td>
            <td>${indent.Commission}</td>
            <td>${indent.Total.toFixed(2)}</td>
            <td>
            <button class="details" onclick="showDetails('${indent.ComplexRef}', '${indent.Item}', '${indent.Supplier}')">Details</button>
                <button class="edit" onclick="window.location.href='edit.html?indentNo=${encodeURIComponent(indent.IndentNo)}'">Edit</button>
<button class="delete" onclick="deleteIndent('${indent.IndentNo}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    }
}

// Function to show details in a modal
function showDetails(complexRef, item, supplier) {
    const modal = document.getElementById('detailsModal');
    const complexRefSpan = document.getElementById('complexRef');
    const itemSpan = document.getElementById('item');
    const supplierSpan = document.getElementById('supplier');

    complexRefSpan.textContent = complexRef;
    itemSpan.textContent = item;
    supplierSpan.textContent = supplier;

    modal.style.display = 'block';

    // Add event listener to close the modal
    const closeSpan = document.querySelector('.close');
    closeSpan.addEventListener('click', () => {
        modal.style.display = 'none';
    });

}


// Function to setup pagination
function setupPagination(totalRecords) {
    const paginationDiv = document.getElementById('pagination');
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    paginationDiv.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        pageButton.addEventListener('click', function () {
            displayIndents(allIndents, i);
            currentPage = i;
        });
        paginationDiv.appendChild(pageButton);
    }
}

// Function to handle editing an indent
function editIndent(indentNo) {
    const trimmedIndentNo = indentNo.trim(); // Trim spaces from the indent number
    console.log(`Fetching indent details for: '${trimmedIndentNo}'`); // Log the trimmed indent number
    fetch(`/get-indents/${encodeURIComponent(trimmedIndentNo)}`) // Use encodeURIComponent to handle special characters
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch indent details');
            return response.json();
        })
        .then(indent => {
            console.log('Fetched indent:', indent); // Log the fetched indent details
            // Check if the indent object has the expected properties
            if (!indent || !indent.Month) {
                throw new Error('Indent data is incomplete or missing.');
            }

            // Populate the form with indent details using the new IDs
            document.getElementById('year').value = indent.Year;
            document.getElementById('month').value = indent.Month;
            document.getElementById('editCurrency').value = indent.Currency;
            document.getElementById('editBaseValue').value = indent.BaseValue;
            document.getElementById('editHarringAndTransport').value = indent.HarringAndTransport;
            document.getElementById('editVat').value = indent.VAT;
            document.getElementById('editNat').value = indent.NAT;
            document.getElementById('editAdvance').value = indent.Advance;
            document.getElementById('editReimbursement').value = indent.Reimbursement;
            document.getElementById('editCommission').value = indent.Commission;
            document.getElementById('editComplexRef').value = indent.ComplexRef;
            document.getElementById('editItem').value = indent.Item;
            document.getElementById('editSupplier').value = indent.Supplier;

            // Set up the save button to update the indent
            document.getElementById('saveButton').onclick = () => {
                updateIndent(indent.IndentNo);
            };
        })
        .catch(error => {
            console.error('Error fetching indent:', error);
            alert('There was an error fetching the indent details: ' + error.message);
        });
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Fetch all indents
    fetch('/get-indents')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allIndents = data; // Store all indents
            displayIndents(allIndents, currentPage);
            setupPagination(allIndents.length);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            alert('There was a problem fetching the indent records.');
        });

    // Check if there is an indent number in the URL to edit
    const urlParams = new URLSearchParams(window.location
        .search);
    const indentNo = urlParams.get('indentNo'); // Get the indent number from the URL

    if (indentNo) {
        editIndent(indentNo); // Call the editIndent function with the indent number
    } else {
        console.error('No indent number provided in the URL.');
    }
});

// Function to update an indent
function updateIndent(indentNo) {
    const data = {
        month: document.getElementById('month').value,
        currency: document.getElementById('currency').value,
        baseValue: parseFloat(document.getElementById('baseValue').value) || 0,
        harringAndTransport: parseFloat(document.getElementById('harringAndTransport').value) || 0,
        vat: parseFloat(document.getElementById('vat').value) || 0,
        nat: parseFloat(document.getElementById('nat').value) || 0,
        advance: parseFloat(document.getElementById('advance').value) || 0,
        reimbursement: parseFloat(document.getElementById('reimbursement').value) || 0,
        commission: parseFloat(document.getElementById('commission').value) || 0,
        complexRef: document.getElementById('complexRef').value,
        item: document.getElementById('item').value,
        supplier: document.getElementById('supplier').value
    };

    fetch(`/update-indent/${indentNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update indent');
            return response.json();
        })
        .then(result => {
            alert('Indent updated successfully');
            location.reload(); // Refresh the page to reflect changes
        })
        .catch(error => {
            console.error('Error updating indent:', error);
            alert('There was an error updating the indent.');
        });
}

// Function to delete an indent
function deleteIndent(indentNo) {
    if (!confirm('Are you sure you want to delete this indent?')) return;

    // Trim the indent number to remove any leading or trailing spaces
    const trimmedIndentNo = indentNo.trim();

    // Log the attempt to delete the indent
    console.log(`Attempting to delete indent with number: ${trimmedIndentNo}`);

    // Encode the trimmed indent number
    const encodedIndentNo = encodeURIComponent(trimmedIndentNo);

    console.log(`Fetching: /delete-indent/${encodedIndentNo}`);

    fetch(`/delete-indent/${encodedIndentNo}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) {
                if (response.headers.get('Content-Type')?.includes('application/json')) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'Failed to delete indent');
                    });
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            alert('Indent deleted successfully');
            location.reload(); // Refresh the page after successful deletion
        })
        .catch(error => {
            console.error('Error deleting indent:', error);
            alert('There was an error deleting the indent: ' + error.message);
        });
}



// Function to export indents to Excel
function exportToExcel(data) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Indents');

    XLSX.writeFile(workbook, 'Indents.xlsx');
}
