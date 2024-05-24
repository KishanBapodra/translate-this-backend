import "dotenv/config";
import express from "express";
import { client } from "./src/dbconnect.js";
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "./src/auth.js";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import translateText from "./src/claude.js";
import cookieParser from "cookie-parser";

const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

// CORS Headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.DOMAIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  next();
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    await client.connect();

    const usersCollection = client.db("translationThis").collection("users");

    // const oldUser = await usersCollection.findOne({ email: email });
    // if (oldUser) {
    //   return res
    //     .status(409)
    //     .send("User Email Already Exist. Please use another email.");
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { name, email, hashedPassword };
    const result = await usersCollection.insertOne(user);

    const token = jwt.sign(
      { userId: result.insertedId.toString() },
      process.env.SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );

    res
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .status(201)
      .json({
        message: "User created successfully",
        userId: result.insertedId,
      });
  } catch (error) {
    res.status(400).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    await client.connect();

    const usersCollection = client.db("translationThis").collection("users");

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );

    res
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .status(201)
      .json({
        message: "logged in successfully",
        userId: user._id,
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.post("/logout", verifyToken, (req, res) => {
  res
    .clearCookie("access_token")
    .status(200)
    .json({ message: "Logout successful" });
});

app.post("/translate", verifyToken, async (req, res) => {
  const { originalText, language } = req.body;
  const userId = req.userId;
  try {
    await client.connect();
    const translatedText = await translateText(originalText, language);

    const newTranslation = {
      userId: ObjectId.createFromHexString(userId),
      originalText,
      translatedText,
      language,
    };

    const translated = await client
      .db("translationThis")
      .collection("translations")
      .insertOne(newTranslation);

    res.status(200).json({
      translatedText,
      language,
      id: translated.insertedId.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.get("/translations/:userId", verifyToken, async (req, res) => {
  const userId = req.params.userId;

  try {
    await client.connect();

    const translations = await client
      .db("translationThis")
      .collection("translations")
      .find({ userId: ObjectId.createFromHexString(userId) })
      .toArray();

    res.status(200).json({ translations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.get("/translation/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {
    await client.connect();

    const translation = await client
      .db("translationThis")
      .collection("translations")
      .findOne({ _id: ObjectId.createFromHexString(id) });

    res.status(200).json({ translation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.delete("/translation/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  try {
    await client.connect();

    const translation = await client
      .db("translationThis")
      .collection("translations")
      .deleteOne({ _id: ObjectId.createFromHexString(id) });

    res.status(200).json({ message: "Translation deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
