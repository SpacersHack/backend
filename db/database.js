const { Ottoman } = require("ottoman");

const ottoman = new Ottoman({ collectionName: "_default" });

const databaseConnection = async () => {
  await ottoman.connect({
    connectionString: process.env.CLUSTER_CONNECTION_STRING,
    bucketName: process.env.CB_BUCKET,
    username: process.env.COUCHBASE_USERNAME,
    password: process.env.COUCHBASE_PASSWORD,
  });

  console.log("Database connected");
};

module.exports = { databaseConnection, ottoman };
