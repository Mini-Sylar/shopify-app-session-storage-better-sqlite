import { Session } from "@shopify/shopify-api";
import type {
  SessionStorage,
  RdbmsSessionStorageOptions,
} from "@shopify/shopify-app-session-storage";
import betterSqlite3 from "better-sqlite3";

import { BetterSqliteConnection } from "./better-sqlite-connection";
import { migrationList } from "./migrations";
import { BetterSqliteSessionStorageMigrator } from "./better-sqlite-migrator";

export interface SQLiteSessionStorageOptions extends RdbmsSessionStorageOptions {}

const defaultSQLiteSessionStorageOptions: SQLiteSessionStorageOptions = {
  sessionTableName: "shopify_sessions",
  migratorOptions: {
    migrationDBIdentifier: "shopify_sessions_migrations",
    migrationNameColumnName: "migration_name",
  },
};

export class BetterSQLiteSessionStorage implements SessionStorage {
  public readonly ready: Promise<void>;
  private options: SQLiteSessionStorageOptions;
  private db: BetterSqliteConnection;
  private internalInit: Promise<void>;
  private migrator: BetterSqliteSessionStorageMigrator;

  constructor(
    database: string | betterSqlite3.Database,
    opts: Partial<SQLiteSessionStorageOptions> = {},
  ) {
    this.options = { ...defaultSQLiteSessionStorageOptions, ...opts };
    this.db = new BetterSqliteConnection(
      database,
      this.options.sessionTableName,
    );
    this.internalInit = this.init();
    this.migrator = new BetterSqliteSessionStorageMigrator(
      this.db,
      this.options.migratorOptions,
      migrationList,
    );
    this.ready = this.migrator.applyMigrations(this.internalInit);
  }

  public async storeSession(session: Session): Promise<boolean> {
    await this.ready;

    // Note milliseconds to seconds conversion for `expires` property
    let entries = session.toPropertyArray().map(([key, value]) => {
      // convert dates to seconds
      if (key === "expires" || key === "refreshTokenExpires") {
        if (value === null || value === undefined) return [key, null];
        return [key, Math.floor((value as number) / 1000)];
      }

      // booleans -> integers (SQLite bindings expect numbers/strings/null)
      if (typeof value === "boolean") {
        return [key, value ? 1 : 0];
      }

      // undefined -> null
      if (value === undefined) return [key, null];

      // objects/arrays -> JSON string
      if (typeof value === "object" && value !== null) {
        try {
          return [key, JSON.stringify(value)];
        } catch (_err) {
          return [key, null];
        }
      }

      return [key, value];
    });

    // if onlineAccessInfo exists, store full object as JSON (to satisfy user-info tests)
    if (
      session.onlineAccessInfo &&
      typeof session.onlineAccessInfo === "object"
    ) {
      const idx = entries.findIndex(([k]) => k === "onlineAccessInfo");
      if (idx !== -1) {
        entries[idx] = [
          "onlineAccessInfo",
          JSON.stringify(session.onlineAccessInfo),
        ];
      }
    }

    const query = `
      INSERT OR REPLACE INTO ${this.options.sessionTableName}
      (${entries.map(([key]) => key).join(", ")})
      VALUES (${entries
        .map(() => `${this.db.getArgumentPlaceholder()}`)
        .join(", ")});
    `;

    await this.db.query(
      query,
      entries.map(([_key, value]) => value),
    );
    return true;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    await this.ready;
    const query = `
      SELECT * FROM ${this.options.sessionTableName}
      WHERE id = ${this.db.getArgumentPlaceholder()};
    `;
    const rows = await this.db.query(query, [id]);
    if (!Array.isArray(rows) || rows?.length !== 1) return undefined;
    const rawResult = rows[0] as any;
    return this.databaseRowToSession(rawResult);
  }

  public async deleteSession(id: string): Promise<boolean> {
    await this.ready;
    const query = `
      DELETE FROM ${this.options.sessionTableName}
      WHERE id = ${this.db.getArgumentPlaceholder()};
    `;
    await this.db.query(query, [id]);
    return true;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    await this.ready;
    const query = `
      DELETE FROM ${this.options.sessionTableName}
      WHERE id IN (${ids
        .map(() => `${this.db.getArgumentPlaceholder()}`)
        .join(",")});
    `;
    await this.db.query(query, ids);
    return true;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    await this.ready;
    const query = `
      SELECT * FROM ${this.options.sessionTableName}
      WHERE shop = ${this.db.getArgumentPlaceholder()};
    `;
    const rows = await this.db.query(query, [shop]);
    if (!Array.isArray(rows) || rows?.length === 0) return [];

    const results: Session[] = rows.map((row: any) => {
      return this.databaseRowToSession(row);
    });
    return results;
  }

  private async init() {
    const hasSessionTable = await this.db.hasTable(
      this.options.sessionTableName,
    );
    if (!hasSessionTable) {
      const query = `
        CREATE TABLE ${this.options.sessionTableName} (
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
        );
      `;
      await this.db.query(query);
    }
  }

  private databaseRowToSession(row: any): Session {
    // convert seconds to milliseconds prior to creating Session object
    if (row.expires) row.expires *= 1000;
    if (row.refreshTokenExpires) row.refreshTokenExpires *= 1000;
    // parse JSON fields back into objects when stored as strings
    if (row.onlineAccessInfo && typeof row.onlineAccessInfo === "string") {
      try {
        row.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
      } catch (_err) {
        // leave as string if parsing fails
      }
    }

    // convert numeric isOnline back to boolean
    if (row.isOnline === 1) row.isOnline = true;
    if (row.isOnline === 0) row.isOnline = false;

    // if we have a proper object for onlineAccessInfo, use direct constructor
    if (row.onlineAccessInfo && typeof row.onlineAccessInfo === "object") {
      return new Session(row as any);
    }

    return Session.fromPropertyArray(Object.entries(row));
  }
}
