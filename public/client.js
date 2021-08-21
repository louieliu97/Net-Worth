console.log('Client-side code running');

const insertButton = document.getElementById('insertButton');
insertButton.addEventListener('click', function (e) {
    console.log('insertButton was clicked');
    var assetSelect = document.getElementById('assetSelect');
    var assetName = document.getElementById('assetName');
    var accountName = document.getElementById('accountName');
    var accountValue = document.getElementById('accountValue');

    var assetTypeVal = String(assetSelect.value);
    var assetNameVal = String(assetName.value);
    var accountNameVal = String(accountName.value);
    var accountValueVal = parseFloat(accountValue.value);

    accountName.value = "";
    accountValue.value = "";

    const response = {
        assetType: assetTypeVal,
        assetName: assetNameVal,
        accountName: accountNameVal,
        accountValue: accountValueVal
    };


    fetch('/insert', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
        .then(json => console.log("response: " + json))
      .catch(function (error) {
          console.log(error);
      });
});

const queryButton = document.getElementById('queryButton');
queryButton.addEventListener('click', function (e) {
    console.log('queryButton was clicked');

    var tName = String(document.getElementById('tableSelect').value);
    const response = {
        tableName: tName,
    };

    const queryTextArea = document.getElementById('queryTextArea');
    fetch('/query', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
        .then(function (json) {
            var queryTextAreaStr = "";
            for (let i = 0; i < json.length; i++) {
                const j = JSON.parse(json[i]);
                queryTextAreaStr += "-------------------------------\r\n";
                queryTextAreaStr += "insert Time: " + j["insertTime"] + "\r\n";
                queryTextAreaStr += "account Value: " + j["accountvalue"] + "\r\n";
                queryTextAreaStr += "account Name: " + j["accountName"] + "\r\n";
                queryTextAreaStr += "\r\n-------------------------------\r\n";
            }
            queryTextArea.value = queryTextAreaStr;
        })
        .catch(function (error) {
            console.log(error);
        });
});