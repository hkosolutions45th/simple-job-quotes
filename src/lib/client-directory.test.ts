import { test } from "node:test";
import assert from "node:assert/strict";
import { directoryClientChanges, findDirectoryClient } from "./client-directory";

const clients = [{ id: "harry-id", name: "Harry", email: "harry@example.com" }];
test("renaming Harry to Harry Odia retains the selected directory identity", () => {
  assert.equal(findDirectoryClient(clients, "harry-id", { name: "Harry Odia", email: "new@example.com" })?.id, "harry-id");
});
test("same email matches an existing client before inserting despite a new name", () => {
  assert.equal(findDirectoryClient(clients, null, { name: "Harry Odia", email: " HARRY@example.com " })?.id, "harry-id");
});
test("unrelated clients with blank emails are not matched", () => {
  assert.equal(findDirectoryClient([{ id: "harry-id", name: "Harry", email: "" }], null, { name: "Jane", email: "" }), undefined);
});
test("selected IDs distinguish two same-name contacts even when their emails match", () => {
  const sarahHome = { id: "sarah-home", name: "Sarah Jenkins", email: "sarah@example.com" };
  const sarahCottage = { id: "sarah-cottage", name: "Sarah Jenkins", email: "sarah@example.com" };
  assert.equal(findDirectoryClient([sarahHome, sarahCottage], "sarah-cottage", { name: "Sarah Jenkins", email: "sarah@example.com" })?.id, "sarah-cottage");
});
test("a second job address is an address change, not a contact change", () => {
  const saved = { id: "sarah-id", name: "Sarah Jenkins", email: "sarah@example.com", phone: "416-555-0100", address: "10 Home Street", city: "Toronto", province: "ON", postalCode: "M5C 2C7" };
  const secondJob = { ...saved, address: "25 Lake Road", city: "Oakville", postalCode: "L6K 1A1" };
  const { id: _id, ...customer } = secondJob;
  assert.deepEqual(directoryClientChanges(saved, customer), { contact: false, address: true });
});
test("phone and email tweaks require an explicit saved-contact decision", () => {
  const saved = { id: "sarah-id", name: "Sarah Jenkins", email: "sarah@example.com", phone: "416-555-0100", address: "10 Home Street", city: "Toronto", province: "ON", postalCode: "M5C 2C7" };
  const { id: _id, ...customer } = { ...saved, email: "sarah.j@example.com", phone: "416-555-0199" };
  assert.deepEqual(directoryClientChanges(saved, customer), { contact: true, address: false });
});
test("postal formatting and surrounding whitespace do not create false edits", () => {
  const saved = { id: "sarah-id", name: "Sarah Jenkins", email: "sarah@example.com", phone: "416-555-0100", address: "10 Home Street", city: "Toronto", province: "ON", postalCode: "M5C 2C7" };
  const { id: _id, ...customer } = { ...saved, name: "  Sarah Jenkins  ", address: " 10 Home Street ", postalCode: "m5c 2c7" };
  assert.deepEqual(directoryClientChanges(saved, customer), { contact: false, address: false });
});