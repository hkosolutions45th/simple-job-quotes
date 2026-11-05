import { test } from "node:test";
import assert from "node:assert/strict";
import { findDirectoryClient } from "./client-directory";

const clients = [{ id: "harry-id", name: "Harry", email: "harry@example.com" }];
test("renaming Harry to Harry Odia retains the selected directory identity", () => {
  assert.equal(findDirectoryClient(clients, "harry-id", { name: "Harry Odia", email: "new@example.com" })?.id, "harry-id");
});
test("same email matches an existing client before inserting despite a new name", () => {
  assert.equal(findDirectoryClient(clients, null, { name: "Harry Odia", email: " HARRY@example.com " })?.id, "harry-id");
});
test("unrelated clients with blank emails are not matched", () => {
  assert.equal(findDirectoryClient([{ ...clients[0], email: "" }], null, { name: "Jane", email: "" }), undefined);
});