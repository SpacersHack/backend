// const couchbase = require("couchbase");

// const connectCouchbaseDatabase = async () => {
//   try {
//     const clusterConnStr = process.env.CLUSTER_CONNECTION_STRING; // Replace this with Connection String
//     const username = process.env.COUCHBASE_USERNAME; // Replace this with username from database access credentials
//     const password = process.env.COUCHBASE_PASSWORD; // Replace this with the password from database access credentials

//     const cluster = await couchbase.connect(clusterConnStr, {
//       username: username,
//       password: password,
//       configProfile: "wanDevelopment",
//     });

//     console.log("Connection successfully");

//     // const createIndexQuery =
//     //   'CREATE INDEX `idx_email` ON `FarmCart`.`data`.`userCollection` (email) WITH { "defer_build": true }';

//     // try {
//     //   await cluster.query(createIndexQuery);
//     //   console.log("Index Created: SUCCESS");
//     // } catch (error) {
//     //   if (error instanceof couchbase.IndexExistsError) {
//     //     // return;
//     //     console.log("Index already exists");
//     //   } else {
//     //     console.error("Failed to create the index:", error);
//     //   }
//     // }

//     return cluster;
//   } catch (error) {
//     console.error("Failed to connect to Couchbase:", error);
//     throw error; // You can rethrow the error to handle it elsewhere
//   }
// };

// //const collection = bucket.scope(scopeName).collection(collectionName);
// async function connectToDatabase() {
//   const cluster = await connectCouchbaseDatabase();
//   const bucketName = process.env.CB_BUCKET;
//   const scopeName = process.env.CB_SCOPE;
//   const bucket = cluster.bucket(bucketName);
//   const collection = bucket.defaultCollection();
//   const userCollection = bucket.scope(scopeName).collection("userCollection");
//   const productCollection = bucket
//     .scope(scopeName)
//     .collection("productCollection");

//   let dbConnection = {
//     cluster,
//     bucket,
//     collection,
//     userCollection,
//     productCollection,
//   };

//   return dbConnection;
// }

// module.exports = connectToDatabase;

const couchbase = require("couchbase");

const connectCouchbaseDatabase = async () => {
  try {
    const clusterConnStr = process.env.CLUSTER_CONNECTION_STRING;
    const username = process.env.COUCHBASE_USERNAME;
    const password = process.env.COUCHBASE_PASSWORD;

    const cluster = await couchbase.connect(clusterConnStr, {
      username: username,
      password: password,
      configProfile: "wanDevelopment",
    });

    console.log("Connection successfully");

    return cluster;
  } catch (error) {
    console.error("Failed to connect to Couchbase:", error);
    throw error;
  }
};

// Export userCollection, productCollection, and bucket
async function connectToDatabase() {
  const cluster = await connectCouchbaseDatabase();
  const bucketName = process.env.CB_BUCKET;
  const scopeName = process.env.CB_SCOPE;
  const bucket = cluster.bucket(bucketName);
  const userCollection = bucket.scope(scopeName).collection("userCollection");
  const productCollection = bucket
    .scope(scopeName)
    .collection("productCollection");

  return { userCollection, productCollection, bucket, cluster };
}

module.exports = connectToDatabase;
