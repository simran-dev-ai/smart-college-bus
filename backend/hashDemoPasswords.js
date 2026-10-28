
const db = require("./config/db");
const bcrypt = require("bcryptjs");

async function main() {
    const emails = [
        "student.demo@example.com",
        "admin@example.com",
        "rahul.driver@example.com"
    ];

    for (const email of emails) {
        const [rows] = await db.execute(
            "SELECT id, password FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (rows.length === 0) {
            console.log("User not found:", email);
            continue;
        }

        const user = rows[0];

        // Skip passwords that are already hashed.
        if (/^\$2[aby]\$/.test(user.password)) {
            console.log("Password already hashed:", email);
            continue;
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);

        await db.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, user.id]
        );

        console.log("Password setup completed:", email);
    }
}

main()
    .catch((error) => {
        console.error("Error:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
    });
