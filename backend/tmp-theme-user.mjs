import sequelize from "./src/db.js";
import { User } from "./src/models/index.js";
await sequelize.authenticate();
const email = "theme-check@example.com";
let user = await User.findOne({ where: { email } });
if (!user) {
  user = await User.create({ name: "Theme Check", email, phone: "0788222333", password: "password123", isVerified: true });
} else {
  user.isVerified = true;
  await user.save();
}
console.log("ready:", user.email);
await sequelize.close();
