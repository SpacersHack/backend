// const couchbase = require("couchbase");
// const { connectCouchbaseDatabase } = require("../db/Couchbase");

// const initializeCluster = async () => {
//   try {
//     const cluster = await connectCouchbaseDatabase();
//     return cluster;
//   } catch (error) {
//     console.error("Failed to connect to Couchbase:", error);
//     return null;
//   }
// };

// const userExists = async (email) => {
//   try {

//     const cluster = await initializeCluster();

//     if (!cluster) {
//       // return next(new ErrorHandler("Failed to connect to Couchbase", 500));
//       console.log("Faild");
//     }

//     const bucket = await cluster.bucket("FarmCart");

//     const queryResult = await bucket
//       .scope("users-table")
//       .query("SELECT email FROM `users` WHERE email=$1 ", {
//         parameters: [email],
//       });
//     console.log("Query Results:", queryResult);
//     queryResult.rows.forEach((row) => {
//       console.log(row);
//     });
//   } catch (error) {
//     console.error("Error checking if user exists:", error);
//     throw error;
//   }
// };

// module.exports = userExists;
