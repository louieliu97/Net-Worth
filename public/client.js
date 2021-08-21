console.log('Client-side code running');

const insertButton = document.getElementById('insertButton');
insertButton.addEventListener('click', function (e) {
    console.log('insertButton was clicked');

    var tName = String(document.getElementById('tableSelect').value);
    var aName = String(document.getElementById('accountName').value);
    var aValue = parseFloat(document.getElementById('accountValue').value);
    const response = {
        tableName: tName,
        accountName: aName,
        accountValue: aValue
    };

    fetch('/clicked', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type' : 'application/json'}
    }).then(res => res.json())
      .then(json => console.log("response: " + json))
      .catch(function (error) {
          console.log(error);
      });
});

setInterval(function () {
    fetch('/clicks', { method: 'GET' })
        .then(function (response) {
            if (response.ok) return response.json();
            throw new Error('Request failed.');
        })
        .then(function (data) {
            document.getElementById('counter').innerHTML = `Button was clicked ${data.length} times`;
        })
        .catch(function (error) {
            console.log(error);
        });
}, 1000);