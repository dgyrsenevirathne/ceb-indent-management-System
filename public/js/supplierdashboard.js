let currentPage = 1;
const recordsPerPage = 10; // Number of records to display per page
let allSuppliers = []; // Store all suppliers for filtering and pagination

// Debounce function to limit the rate at which a function can fire
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Search and filter functionality
const filterSuppliers = () => {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase(); // Trim spaces and convert to lowercase
    const filteredSuppliers = allSuppliers.filter(supplier => {
        const supplierName = supplier.SupplierName ? supplier.SupplierName.toLowerCase().trim() : '';
        return supplierName.includes(searchTerm);
    });
    displaySuppliers(filteredSuppliers, 1); // Reset to first page
    setupPagination(filteredSuppliers.length);
};

// Use debounce to limit the filter function calls
const debouncedFilterSuppliers = debounce(filterSuppliers, 300); // 300ms delay

document.getElementById('filterButton').addEventListener('click', function () {
    // Clear the search input field
    document.getElementById('searchInput').value = '';
    // Call the debounced filter function
    debouncedFilterSuppliers();
});
document.getElementById('searchInput').addEventListener('input', debouncedFilterSuppliers); // Call filter on input

// Export to Excel functionality
document.getElementById('exportExcelButton').addEventListener('click', function () {
    exportToExcel(allSuppliers); // Use the allSuppliers array to export
});

// Function to display suppliers based on the current page
function displaySuppliers(suppliers, page) {
    const tableBody = document.getElementById('supplierTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    const startIndex = (page - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, suppliers.length);

    for (let i = startIndex; i < endIndex; i++) {
        const supplier = suppliers[i];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${supplier.SupplierID}</td>
            <td>${supplier.SupplierName}</td>
             <td>
                <button class="edit" onclick="editSupplier(${supplier.SupplierID})">Edit</button>
                <button class="delete" onclick="deleteSupplier(${supplier.SupplierID})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    }
}

// Function to set up pagination
function setupPagination(totalRecords) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = ''; // Clear existing pagination

    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displaySuppliers(allSuppliers, currentPage);
        });
        paginationContainer.appendChild(pageButton);
    }
}

// Function to export suppliers to Excel
function exportToExcel(data) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Suppliers.xlsx');
}


// Initial fetch of suppliers when the page loads
document.addEventListener('DOMContentLoaded', function () {
    fetchSuppliers();
});

// Function to fetch suppliers from the database
function fetchSuppliers() {
    fetch('/get-suppliers')
        .then(response => response.json())
        .then(data => {
            allSuppliers = data; // Store all suppliers for filtering and pagination
            displaySuppliers(allSuppliers, 1); // Reset to first page
            setupPagination(allSuppliers.length);
            getNextSupplierID();
        })
        .catch(error => console.error('Error fetching suppliers:', error));
}

// Function to get the next supplier ID
function getNextSupplierID() {
    fetch('/get-next-supplier-id')
        .then(response => response.json())
        .then(data => {
            document.getElementById('supplierID').value = data.nextID;
        })
        .catch(error => console.error('Error getting next supplier ID:', error));
}

// Add event listener to the form submission
document.getElementById('addSupplierForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    const supplierName = document.getElementById('supplierName').value.trim(); // Trim spaces
    const supplierID = document.getElementById('supplierID').value;

    // Send the data to the server
    fetch('/add-supplier', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplierID, supplierName })
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert('Supplier added successfully!');
            location.reload(); // Refresh the page to reflect changes
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('There was a problem adding the supplier.');
        });
});

// Function to delete a supplier
function deleteSupplier(supplierID) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    fetch('/delete-supplier', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplierID })
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to delete supplier');
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert('Supplier deleted successfully!');
            location.reload(); // Refresh the page to reflect changes
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('There was a problem deleting the supplier.');
        });
}

// Function to edit a supplier
function editSupplier(supplierID) {
    // Open a new window or modal to edit the supplier
    const editWindow = window.open('edit-supplier.html?supplierID=' + supplierID, '_blank', 'width=400,height=200');
}

