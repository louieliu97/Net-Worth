console.log('Server-side code running');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const mongodb = require('mongodb');
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

const constructAssets = async (db) => {
    try {
        const assets_db = db.collection("assets");
        var json = {};
        const items = await assets_db.find().toArray();

        for (let i = 0; i < items.length; i++) {
            json[items[i].asset_type] = items[i].value;
        }
        return json;
    }
    catch (err) { console.error(err); }
}

app.get('/assets', async function (req, res) {
    var poll = await constructAssets(db);
    res.json(poll);
});

app.get('/networth', async function (req, res) {
    try {
        const assets_db = db.collection("total_assets_time");
        const items = await assets_db.find().toArray();

        var data = [];

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            var d = { date: item.date, value: item.value };
            data.push(d);
        }
        res.json(data);
    }
    catch (err) { console.error(err); }
});

const getAssetAccount = async (db, assetType, accountName) => {
    try {
        const asset_accounts = db.collection("asset_accounts");

        const items = await asset_accounts.find({
            asset_type: assetType,
            account_name: accountName,
        });
        return items.toArray();
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const getAssetAccountItem = async (db, assetType, accountName, assetName) => {
    try {
        const asset_accounts_items = await db.collection("asset_accounts_items");

        const items = await asset_accounts_items.find({
            asset_type: assetType,
            account_name: accountName,
            asset_name: assetName
        });
        return items.toArray();
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const incAsset = async (db, assetType, accountValue) => {
    try {
        const asset_db = db.collection("assets");
        const query = { asset_type: assetType };
        var item = await asset_db.findOne(query);

        if (item == null) {
            const asset_obj = {
                asset_type: assetType,
                value: accountValue
            }
            asset_db
                .insertOne(asset_obj)
                .then(
                    res => console.log("Added to assets"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        } else {
            var replace = {
                $inc: {
                    value: accountValue
                }
            }
            asset_db
                .updateOne(query, replace)
                .then(
                    res => console.log("Updated assets"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const incAssetAccount = async (db, assetType, accountName, accountValue) => {

    try {
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
            curr_account_total += accountValue;
            var query = {
                asset_type: assetType,
                account_name: accountName
            }
            var replace = {
                $set: {
                    asset_type: assetType,
                    account_name: accountName,
                    last_transaction_date: new Date(),
                    value: mongodb.Double(curr_account_total),
                    dollar_value: mongodb.Double(curr_account_total)
                }
            }
            asset_account_db
                .updateOne(query, replace)
                .then(
                    res => console.log("Updated asset_account"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const incAssetTransactions = async (db, assetType, assetName, accountName, accountValue) => {
    try {
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
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const incAssetAccountItems = async (db, assetType, assetName, accountName, accountValue) => {
    try {
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
            asset_account_total += accountValue;
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
                    value: mongodb.Double(asset_account_total),
                    dollar_value: mongodb.Double(asset_account_total)
                }
            }
            asset_account_item_db
                .updateOne(query, replace)
                .then(
                    res => console.log("Updated asset_account_item"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}


const incTotalAssetsTime = async (db, accountValue, assetType) => {
    try {
        const total_assets_time_db = db.collection("total_assets_time");
        const now = new Date();
        var day = now.getDate();
        var month = now.getMonth();
        var year = now.getFullYear();

        const date = new Date(year, month, day);

        const assets = await total_assets_time_db.findOne({ date: date });
        console.log("assets: " + assets);
        
        // If first time inserting this asset for this account, insert for first time
        if (assets == null) {
            const item = {
                date: date,
                value: accountValue,
                asset_types: [assetType]
            }
            total_assets_time_db
                .insertOne(item)
                .then(
                    res => console.log("Added to total_asset_time"),
                    err => console.error(`Something went wrong: ${err}`)
                );
            // otherwise modify value
        } else {
            var totalValue = assets.value + mongodb.Double(accountValue);
            const item = {
                date: date
            }
            var replace = {
                $inc: {
                    value: totalValue
                },
                $addToSet: {
                    asset_types: assetType
                }
                
            }
            total_assets_time_db
                .updateOne(item, replace)
                .then(
                    res => console.log("Updated total_asset_time"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}


app.post('/insert', async function (req, res) {
    var assetType = req.body.assetType;
    var assetName = req.body.assetName;
    var accountName = req.body.accountName;
    var accountValue = mongodb.Double(req.body.accountValue);

    await Promise.allSettled([incAsset(db, assetType, accountValue),
    incAssetAccount(db, assetType, accountName, accountValue),
    incAssetTransactions(db, assetType, assetName, accountName, accountValue),
    incAssetAccountItems(db, assetType, assetName, accountName, accountValue),
    incTotalAssetsTime(db, accountValue, assetType)]);
   
    res.sendStatus(201);
})

app.post('/query', (req, res) => {
    var tableName = String(req.body.tableName);

    const collection = db.collection(tableName);
    var array = [];
    var stream = collection.find().stream();
    stream.on("data", function (item) {
        var str = JSON.stringify(item);
        array.push(str);
    });
    stream.on("end", function () {
        res.send(JSON.stringify(array));
    });

})
