console.log('Server-side code running');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const bodyParser = require('body-parser');

const app = express();

// serve files from the public directory
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const url = 'mongodb://localhost:27017';
const dbName = 'NetWorth-test';

let db;

const poll = [
    {
        name: 'Chelsea',
        votes: 100,
    },
    {
        name: 'Arsenal',
        votes: 70,
    },
    {
        name: 'Liverpool',
        votes: 250,
    },
    {
        name: 'Manchester City',
        votes: 689,
    },
    {
        name: 'Manchester United',
        votes: 150,
    },
];

MongoClient.connect(url, function (err, client) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    db = client.db(dbName);

    // start the express web server listening on 8080
    app.listen(8080, () => {
        console.log('listening on 8080');
    });
});

// serve the homepage
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/poll', (req, res) => {
    res.json(poll);
});

const getAssetAccount = async (db, assetTypeVal, accountNameVal) => {
    try {
        const asset_accounts = db.collection("asset_accounts");

        const items = await asset_accounts.find({
            asset_type: assetTypeVal,
            account_name: accountNameVal,
        });
        return items.toArray();
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const getAssetAccountItem = async (db, assetTypeVal, accountNameVal, assetNameVal) => {
    try {
        const asset_accounts_items = await db.collection("asset_accounts_items");

        const items = await asset_accounts_items.find({
            asset_type: assetTypeVal,
            account_name: accountNameVal,
            asset_name: assetNameVal
        });
        return items.toArray();
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

app.post('/insert', async function (req, res) {
    var assetType = req.body.assetType;
    var assetName = req.body.assetName;
    var accountName = req.body.accountName;
    var accountValue = parseFloat(req.body.accountValue);


    const asset_account_db = db.collection("asset_accounts");

    let curr_account_total = 0;
    var account_assets = await getAssetAccount(db, assetType, accountName);
    for (let i = 0; i < account_assets.length; i++)
        curr_account_total += parseFloat(account_assets[i].value);

    if (curr_account_total == 0) {
        const asset_account = {
            asset_type: assetType,
            account_name: accountName,
            last_transaction_date: new Date(),
            value: accountValue,
            dollar_value: accountValue,
        }
        asset_account_db
            .insertOne(asset_account)
            .then(
                res => console.log("Added to asset_account"),
                err => console.error(`Something went wrong: ${err}`)
            );
        // modify the total value to add value
    } else {
        var query = {
            asset_type: assetType,
            account_name: accountName
        }
        var replace = {
            $set: {
                asset_type: assetType,
                account_name: accountName,
                last_transaction_date: new Date(),
                value: curr_account_total + accountValue,
                dollar_value: curr_account_total + accountValue
            }
        }
        asset_account_db
            .updateOne(query, replace)
            .then(
                res => console.log("Updated asset_account"),
                err => console.error(`Something went wrong: ${err}`)
            );
    }
            
    const asset_transactions_db = db.collection("asset_transactions");
    var asset_transaction = {
        asset_type: assetType,
        asset_name: assetName,
        account_name: accountName,
        date: new Date(),
        value: accountValue,
        dollar_value: accountValue,
    }
    asset_transactions_db
        .insertOne(asset_transaction)
        .then(
            res => console.log("Updated asset_account_transaction"),
            err => console.error(`Something went wrong: ${err}`)
        );
        // modify the total value to add value


    const asset_account_item_db = db.collection("asset_accounts_items");

    let asset_account_total = 0;
    var asset_account_item = await getAssetAccountItem(db, assetType, accountName, assetName);
    for (let i = 0; i < asset_account_item.length; i++) {
        asset_account_total += parseFloat(asset_account_item[i].value);
    }
    // If first time inserting this asset for this account, insert for first time
    if (asset_account_total == 0) {
        const asset_account_item = {
            asset_type: assetType,
            account_name: accountName,
            asset_name: assetName,
            last_transaction_date: new Date(),
            value: accountValue,
            dollar_value: accountValue
        }
        asset_account_item_db
            .insertOne(asset_account_item)
            .then(
                res => console.log("Added to asset_account_item"),
                err => console.error(`Something went wrong: ${err}`)
            );
    // otherwise modify value
    } else {
        var query = {
            asset_type: assetType,
            account_name: accountName,
            asset_name: assetName
        }
        var replace = {
            $set: {
                asset_type: assetType,
                account_name: accountName,
                asset_name: assetName,
                last_transaction_date: new Date(),
                value: asset_account_total + accountValue,
                dollar_value: asset_account_total + accountValue
            }
        }
        asset_account_item_db
            .updateOne(query, replace)
            .then(
                res => console.log("Updated asset_account_item"),
                err => console.error(`Something went wrong: ${err}`)
            );
    }
    res.sendStatus(201);
})

app.post('/query', (req, res) => {
    console.log("Querying from database");
    var tableName = String(req.body.tableName);

    const collection = db.collection(tableName);
    var array = [];
    var stream = collection.find().stream();
    stream.on("data", function (item) {
        var str = JSON.stringify(item);
        array.push(str);
    });
    stream.on("end", function () {
        console.log(JSON.stringify(array));
        res.send(JSON.stringify(array));
    });

})
