import betterSqlite from "better-sqlite3";
import type { RdbmsConnection } from "@shopify/shopify-app-session-storage";

export class BetterSqliteConnection implements RdbmsConnection {
  sessionStorageIdentifier: string;
  private db: betterSqlite.Database;
  private stmtCache = new Map<
    string,
    betterSqlite.Statement<unknown[], unknown>
  >();

  constructor(
    database: string | betterSqlite.Database,
    sessionStorageIdentifier: string,
  ) {
    this.sessionStorageIdentifier = sessionStorageIdentifier;
    this.db =
      typeof database === "string" ? new betterSqlite(database) : database;
  }

  async query(query: string, params: any[] = []): Promise<any[]> {
    const trimmed = query.trim().toUpperCase();
    const isExecOnly =
      trimmed.startsWith("BEGIN") ||
      trimmed.startsWith("COMMIT") ||
      trimmed.startsWith("ROLLBACK") ||
      trimmed.startsWith("ALTER") ||
      trimmed.startsWith("DROP") ||
      trimmed.startsWith("CREATE");

    if (isExecOnly) {
      this.db.exec(query);
      return [];
    }

    let stmt = this.stmtCache.get(query);
    if (!stmt) {
      stmt = this.db.prepare(query);
      this.stmtCache.set(query, stmt);
    }

    // Decide whether this is a read (returns rows) or write (run) statement
    const firstToken = trimmed.split(/\s+/)[0];
    const isReadStatement =
      firstToken === "SELECT" ||
      firstToken === "PRAGMA" ||
      firstToken === "WITH";

    if (isReadStatement) {
      return stmt.all(params) as any[];
    }

    // Non-select statements (INSERT/UPDATE/DELETE/etc.) use run()
    // run() returns info; callers expect an array, so return an empty array here
    stmt.run(params);
    return [];
  }

  async executeRawQuery(query: string): Promise<void> {
    this.db.exec(query);
  }

  async hasTable(tablename: string): Promise<boolean> {
    const query = `
      SELECT name FROM sqlite_schema
      WHERE type = 'table'
      AND name = ${this.getArgumentPlaceholder()};
    `;
    const rows = await this.query(query, [tablename]);
    return rows.length === 1;
  }

  getArgumentPlaceholder(_?: number): string {
    return `?`;
  }

  async connect(): Promise<void> {
    // Nothing to do here
  }

  async disconnect(): Promise<void> {
    // Nothing to do here
  }
}
