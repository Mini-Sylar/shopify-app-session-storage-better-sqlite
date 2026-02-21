import {
  RdbmsSessionStorageMigrator,
  MigrationOperation,
} from "@shopify/shopify-app-session-storage";
import type { RdbmsSessionStorageMigratorOptions } from "@shopify/shopify-app-session-storage";

import { BetterSqliteConnection } from "./better-sqlite-connection";

export class BetterSqliteSessionStorageMigrator extends RdbmsSessionStorageMigrator {
  constructor(
    dbConnection: BetterSqliteConnection,
    opts: Partial<RdbmsSessionStorageMigratorOptions> = {},
    migrations: MigrationOperation[],
  ) {
    super(dbConnection, opts, migrations);
  }

  async initMigrationPersistence(): Promise<void> {
    const tableExists = await this.connection.hasTable(
      this.options.migrationDBIdentifier,
    );

    if (!tableExists) {
      const migration = `
        CREATE TABLE ${this.options.migrationDBIdentifier} (
          ${
            this.getOptions().migrationNameColumnName
          } varchar(255) NOT NULL PRIMARY KEY
        );`;

      await this.connection.query(migration, []);
    }
  }
}
