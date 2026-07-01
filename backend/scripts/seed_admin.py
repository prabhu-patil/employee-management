import asyncio
from uuid import uuid4

import asyncpg
import bcrypt


DATABASE_URL = "postgresql://emp_user:emp_pass@localhost:5432/emp_db"
ADMIN_PASSWORD = "Admin@123"


async def seed_admin() -> None:
    password_hash = bcrypt.hashpw(
        ADMIN_PASSWORD.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")
    connection = await asyncpg.connect(DATABASE_URL)

    try:
        result = await connection.execute(
            """
            INSERT INTO users (
                id,
                email,
                full_name,
                password_hash,
                role,
                is_active,
                employee_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
            """,
            uuid4(),
            "admin@company.com",
            "Super Admin",
            password_hash,
            "admin",
            True,
            "EMP-001",
        )
    finally:
        await connection.close()

    if result == "INSERT 0 1":
        print("Admin user created successfully")
    else:
        print("Admin user already exists, skipping insert")


if __name__ == "__main__":
    asyncio.run(seed_admin())
