import { MigrationOperation } from "@shopify/shopify-app-session-storage";
import type {
  DBConnection,
  RdbmsConnection,
} from "@shopify/shopify-app-session-storage";

export const migrationList = [
  new MigrationOperation(
    "migrateScopeFieldToVarchar1024",
    migrateScopeFieldToVarchar1024,
  ),
  new MigrationOperation("addRefreshTokenFields", addRefreshTokenFields),
];

async function migrateScopeFieldToVarchar1024(
  engine: DBConnection,
): Promise<void> {
  const connection = engine as RdbmsConnection;
  const identifier = connection.sessionStorageIdentifier;
  const tempTableName = `${identifier}_for_migrateScopeFieldToVarchar1024`;

  await connection.query("BEGIN", []);
  try {
    await connection.query(
      `ALTER TABLE ${identifier} RENAME TO ${tempTableName}`,
      [],
    );
    await connection.query(
      `
      CREATE TABLE ${identifier} (
        id varchar(255) NOT NULL PRIMARY KEY,
        shop varchar(255) NOT NULL,
        state varchar(255) NOT NULL,
        isOnline integer NOT NULL,
        expires integer,
        scope varchar(1024),
        accessToken varchar(255),
        onlineAccessInfo TEXT
      )
    `,
      [],
    );
    await connection.query(
      `
      INSERT INTO ${identifier} (id, shop, state, isOnline, expires, scope, accessToken, onlineAccessInfo)
        SELECT id, shop, state, isOnline, expires, scope, accessToken, onlineAccessInfo
        FROM ${tempTableName}
    `,
      [],
    );
    await connection.query(`DROP TABLE ${tempTableName}`, []);
    await connection.query("COMMIT", []);
  } catch (err) {
    await connection.query("ROLLBACK", []);
    throw err;
  }
}

async function addRefreshTokenFields(engine: DBConnection): Promise<void> {
  const connection = engine as RdbmsConnection;
  const identifier = connection.sessionStorageIdentifier;
  const tempTableName = `${identifier}_for_addRefreshTokenFields`;

  await connection.query("BEGIN", []);
  try {
    await connection.query(
      `ALTER TABLE ${identifier} RENAME TO ${tempTableName}`,
      [],
    );
    await connection.query(
      `
      CREATE TABLE ${identifier} (
        id varchar(255) NOT NULL PRIMARY KEY,
        shop varchar(255) NOT NULL,
        state varchar(255) NOT NULL,
        isOnline integer NOT NULL,
        expires integer,
        scope varchar(1024),
        accessToken varchar(255),
        onlineAccessInfo TEXT,
        refreshToken varchar(255),
        refreshTokenExpires integer
      )
    `,
      [],
    );
    await connection.query(
      `
      INSERT INTO ${identifier}
        (id, shop, state, isOnline, expires, scope, accessToken, onlineAccessInfo)
      SELECT id, shop, state, isOnline, expires, scope, accessToken, onlineAccessInfo
      FROM ${tempTableName}
    `,
      [],
    );
    await connection.query(`DROP TABLE ${tempTableName}`, []);
    await connection.query("COMMIT", []);
  } catch (err) {
    await connection.query("ROLLBACK", []);
    throw err;
  }
}
