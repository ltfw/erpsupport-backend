const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { PrismaClient: PwdatClient } = require("../generated/pwdat");
const pwdat = new PwdatClient();

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  await poolConnect;
  const request = pool.request();
  request.input("username", sql.VarChar, username);
  request.input("password", sql.VarChar, hashed);

  try {
    await request.query(
      "INSERT INTO Users (username, password) VALUES (@username, @password)"
    );
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);

  const queryUsers = await pwdat.$queryRaw`
    SELECT top 1 * FROM Users u
    left join UserSupplier us on us.UserName = u.UserName
    WHERE u.UserName = ${username};
  `;
  const pwUsers = queryUsers[0];

  console.log("user", pwUsers);
  if (!pwUsers) return res.status(400).json({ error: "User not found" });

  const hashedInputPassword = crypto
    .createHash("sha1")
    .update(password)
    .digest("hex");
  console.log(hashedInputPassword, pwUsers.KodePassword);

  if (hashedInputPassword !== pwUsers.KodePassword) {
    return res.status(403).json({ error: "Invalid credentials" });
  }
  
  const token = jwt.sign(
    {
      userId: pwUsers.UserId,
      username: pwUsers.UserName,
      role: pwUsers.UserRoleCode,
      cabang: pwUsers.KodeDept,
      vendor: pwUsers.VendorId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  console.log('jwt',{
      userId: pwUsers.UserId,
      username: pwUsers.UserName,
      role: pwUsers.UserRoleCode,
      cabang: pwUsers.KodeDept,
      vendor: pwUsers.VendorId,
    })

  const { KodePassword, ...safeUser } = pwUsers;
  delete KodePassword
  res.json({ token, user: safeUser });
});

module.exports = router