// Fetch conversion rates from the server
fetch('/get-conversion-rates')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const tableBody = document.getElementById('conversionRateTableBody');
        tableBody.innerHTML = ''; // Clear existing rows

        data.forEach(conversionRate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conversionRate.Currency}</td>
                <td>${conversionRate.ConversionRate}</td>
            `;
            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error fetching conversion rates:', error);
        alert('There was an error fetching the conversion rates: ' + error.message);
    });