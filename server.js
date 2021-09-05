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

const getAssetsArray = async (assets_db) => {
    const items = await assets_db.find().toArray();
    return items;
}

const constructAssets = async (db) => {
    try {
        const assets_db = db.collection("assets");
        var json = {};
        var items = await getAssetsArray(assets_db);

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

const getTotalAssetsTimeArray = async (total_assets_time_db) => {
    const items = await total_assets_time_db.find().toArray();
    return items;
}

app.post('/networth-date', async function (req, res) {
    try {
        var startDate = new Date(req.body.startDate);
        var endDate = new Date(req.body.endDate);

        const total_assets_time_db = db.collection("total_assets_time");
        var assetsRangeArr = await total_assets_time_db.find({
            date: {
                $gt: startDate.toISOString(), $lte: endDate.toISOString()
            }
        }).toArray();
        res.json(assetsRangeArr);
    }
    catch (err) { console.error(err); }
});

app.get('/networth', async function (req, res) {
    try {
        const total_assets_time_db = db.collection("total_assets_time");
        const items = await getTotalAssetsTimeArray(total_assets_time_db);

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

const getAssetTimeObject = async (total_assets_time_db, date) => {
    try {
        return total_assets_time_db.findOne({ date: date.toISOString() });
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const setPrevAssetsTime = async (total_assets_time_db, date, root) => {
    try {
        var yesterday = new Date(date);
        yesterday.setDate(date.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        var asset = await getAssetTimeObject(total_assets_time_db, yesterday);
        if (asset == null) {
            await setPrevAssetsTime(total_assets_time_db, yesterday, false)
        } else {
            console.log("asset: " + asset.date);
        }

        if (root == false) {
            asset = await getAssetTimeObject(total_assets_time_db, yesterday);
            const item = {
                date: date.toISOString(),
                value: asset.value,
                asset_types: asset.asset_types
            }
            total_assets_time_db.insertOne(item)
                .then(
                    res => console.log("Added to total_assets_time on " + item.date),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const checkTotalAssetsEmpty = async (total_assets_time_db) => {
    var db_length = await total_assets_time_db.count();
    if (db_length == 0)
        return true;
    else
        return false;
}

const incTotalAssetsTime = async (db, accountValue, assetType) => {
    try {
        const total_assets_time_db = db.collection("total_assets_time");
        const now = new Date();
        var day = now.getDate();
        var month = now.getMonth();
        var year = now.getFullYear();

        const date = new Date(year, month, day);
        var yesterday = new Date(date);
        yesterday.setDate(date.getDate() - 1);

        const assets = await getAssetTimeObject(total_assets_time_db, date);
        const assets_empty = await checkTotalAssetsEmpty(total_assets_time_db);

        // If first time inserting this asset for this account, insert for first time
        if (assets == null) {
            // potentially skip if this is the first ever entry
            var yesterdayValue = mongodb.Double(0);
            console.log("assets empty: " + assets_empty);
            if (assets_empty == false) {
                console.log("assets not empty");
                await setPrevAssetsTime(total_assets_time_db, date);
                const yesterdayAsset = await getAssetTimeObject(total_assets_time_db, yesterday, true);
                yesterdayValue = yesterdayAsset.value;
            }
            yesterdayValue += mongodb.Double(accountValue);
            yesterdayValue = mongodb.Double(yesterdayValue);
            const item = {
                date: date.toISOString(),
                value: yesterdayValue,
                asset_types: [assetType]
            }
            await total_assets_time_db
                .insertOne(item)
                .then(
                    res => console.log("Added to total_asset_time"),
                    err => console.error(`Something went wrong: ${err}`)
                );
            // otherwise modify value
        } else {
            const item = {
                date: date.toISOString()
            }
            var replace = {
                $inc: {
                    value: mongodb.Double(accountValue)
                },
                $addToSet: {
                    asset_types: assetType
                }

            }
            await total_assets_time_db
                .updateOne(item, replace)
                .then(
                    res => console.log("Updated total_asset_time"),
                    err => console.error(`Something went wrong: ${err}`)
                );
        }
    }
    catch (err) { console.error(err); } // catch any mongo error here
}

const incrementDB = async function (db, assetType, assetName, accountName, accountValue) {
    var p1 = await incAsset(db, assetType, accountValue);
    var p2 = await incAssetAccount(db, assetType, accountName, accountValue);
    var p3 = await incAssetTransactions(db, assetType, assetName, accountName, accountValue);
    var p4 = await incAssetAccountItems(db, assetType, assetName, accountName, accountValue);
    var p5 = await incTotalAssetsTime(db, accountValue, assetType);

    await Promise.all([p1, p2, p3, p4, p5])
        .catch(err => { console.error(err) });
}

app.post('/insert', async function (req, res) {
    var assetType = req.body.assetType;
    var assetName = req.body.assetName;
    var accountName = req.body.accountName;
    var accountValue = mongodb.Double(req.body.accountValue);

    await incrementDB(db, assetType, assetName, accountName, accountValue);
    console.log("Done inserting all!");
    res.sendStatus(201);
})

app.post('/insertAssetTimeTest', async function (req, res) {
    console.log("inserting into time test\n");
    var startDate = new Date(req.body.startDate);
    var endDate = new Date(req.body.endDate);
    var difftime = startDate.getTime() - endDate.getTime();
    var diffDays = parseInt(difftime / (1000 * 3600 * 24));
    const total_assets_time_db = db.collection("total_assets_time");
    for (let i = 0; i < diffDays; i++) {
        var ranval = mongodb.Double(Math.floor(Math.random() * (50000 - 5000) + 5000));
        item = { date: endDate.toISOString(), value: ranval, asset_types: ["cash"]};
        await total_assets_time_db.insertOne(item);
        endDate.setDate(endDate.getDate() + 1);
    }
    console.log("inserted " + diffDays + " items");
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
