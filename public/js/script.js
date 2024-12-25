// JavaScript for Dynamic Calculations and Form Submission

document.getElementById('indentForm').addEventListener('input', function () {
    const harringAndTransport = parseFloat(document.getElementById('harringAndTransport').value) || 0;
    const vat = parseFloat(document.getElementById('vat').value) || 0;
    const nat = parseFloat(document.getElementById('nat').value) || 0;
    const advance = parseFloat(document.getElementById('advance').value) || 0;
    const reimbursement = parseFloat(document.getElementById('reimbursement').value) || 0;
    const commission = parseFloat(document.getElementById('commission').value) || 0;
    const baseValue = parseFloat(document.getElementById('baseValue').value) || 0;

    const total = harringAndTransport + vat + nat + advance + reimbursement + commission;
    document.getElementById('total').value = total.toFixed(2);
});

// Add event listener for form submission
document.getElementById('indentForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission

    const formData = {
        year: document.getElementById('year').value.trim(), // Get selected year
        month: document.getElementById('month').value.trim(), // Trim spaces
        indentNo: document.getElementById('indentNo').value.trim(), // Trim spaces
        currency: document.getElementById('currency').value.trim(), // Trim spaces
        baseValue: parseFloat(document.getElementById('baseValue').value) || 0,
        harringAndTransport: parseFloat(document.getElementById('harringAndTransport').value) || 0,
        vat: parseFloat(document.getElementById('vat').value) || 0,
        nat: parseFloat(document.getElementById('nat').value) || 0,
        advance: parseFloat(document.getElementById('advance').value) || 0,
        reimbursement: parseFloat(document.getElementById('reimbursement').value) || 0,
        commission: parseFloat(document.getElementById('commission').value) || 0,
        complexRef: document.getElementById('complexRef').value.trim() || null, // Trim spaces
        item: document.getElementById('item').value.trim() || null, // Trim spaces
        supplier: document.getElementById('supplier').value.trim() || null // Trim spaces
    };

    // Send the data to the server
    fetch('/add-indent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert('Data added successfully!');
            location.reload();
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('There was a problem with the submission.');
        });
});

document.getElementById('updateConversionRateButton').addEventListener('click', function () {
    const currency = document.getElementById('currency').value.trim(); // Get selected currency
    const conversionRate = parseFloat(document.getElementById('conversionRate').value) || 0; // Get conversion rate

    if (!currency || conversionRate <= 0) {
        alert('Please select a currency and enter a valid conversion rate.');
        return;
    }

    // Send the conversion rate to the server
    fetch('/update-conversion-rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currency, conversionRate })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert('Conversion rate updated successfully!');

            document.getElementById('currentConversionRate').textContent = conversionRate.toFixed(2);
            document.getElementById('conversionRate').value = conversionRate; // Optionally update the input field as well

        })
        .catch((error) => {
            console.error('Error:', error);
            alert('There was a problem updating the conversion rate.');
        });
});

// Function to fetch conversion rates and display the current conversion rate
function fetchConversionRates() {
    fetch('/get-conversion-rates') // Adjust the endpoint as necessary
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const currencySelect = document.getElementById('currency');
            const currentConversionRateDisplay = document.getElementById('currentConversionRate');
            const conversionRateInput = document.getElementById('conversionRate');

            // Populate the current conversion rate based on the selected currency
            currencySelect.addEventListener('change', function () {
                const selectedCurrency = this.value;
                const selectedRate = data.find(rate => rate.Currency === selectedCurrency);
                currentConversionRateDisplay.textContent = selectedRate ? selectedRate.ConversionRate.toFixed(2) : '0.00';
                conversionRateInput.value = selectedRate ? selectedRate.ConversionRate : '';
            });

            // Trigger change event on page load to set the initial value
            currencySelect.dispatchEvent(new Event('change'));
        })
        .catch(error => {
            console.error('Error fetching conversion rates:', error);
            alert('There was an error fetching the conversion rates: ' + error.message);
        });
}

// Call the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', fetchConversionRates);
