require("dotenv").config();
const mongoose = require("mongoose");

const connectToDatabase = async () => {
  try {
    await mongoose.set("strictQuery", false);

    await mongoose.connect(process.env.DB_URL, { useNewUrlParser: true });
    console.log("Database connection success.");
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
};

const LogSchema = new mongoose.Schema({
  message: String,
  level: { type: String, enum: ["info", "error", "warning"] },
  timestamp: { type: Date, default: Date.now },
});

const Log = mongoose.model("Log", LogSchema);

async function writeLog(message, level = "info") {
  await connectToDatabase();

  const log = new Log({ message, level });
  log.save((error) => {
    if (error) {
      console.error("Error writing log:", error);
    } else {
      connectDBClose();
    }
  });
}

const connectDBClose = async () => {
  mongoose.connection.close(() => {
    console.log("Connection to the database closed.");
  });
};

module.exports = { connectToDatabase, writeLog, connectDBClose };
