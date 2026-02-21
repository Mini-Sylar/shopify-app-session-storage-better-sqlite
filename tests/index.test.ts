import * as fs from "fs/promises";
import { batteryOfTests } from "./battery-of-tests";
import { describe, beforeAll, afterAll } from "vitest";
import { BetterSQLiteSessionStorage } from "../src/better-sqlite";

describe("SQLite session storage (file-backed)", () => {
  const sqliteDbFile = "./sqlite.testDb";

  beforeAll(async () => {
    // Retry removal because Windows can keep the file locked briefly
    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(sqliteDbFile, { force: true });
        break;
      } catch (err: any) {
        if (err?.code === "EBUSY" || err?.code === "EPERM") {
          // wait and retry
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        throw err;
      }
    }
  });

  afterAll(async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(sqliteDbFile, { force: true });
        break;
      } catch (err: any) {
        if (err?.code === "EBUSY" || err?.code === "EPERM") {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        throw err;
      }
    }
  });

  batteryOfTests(
    async () => {
      const storage = new BetterSQLiteSessionStorage(sqliteDbFile);
      await storage.ready;
      return storage;
    },
    true, // test user info
    true, // test refresh tokens
  );
});
