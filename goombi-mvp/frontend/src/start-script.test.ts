import fs from "node:fs";
import path from "node:path";

test("start.ps1 launches the external browser via Start-Process", () => {
  const scriptPath = path.resolve(process.cwd(), "..", "start.ps1");
  const content = fs.readFileSync(scriptPath, "utf8");

  expect(content).toContain('Start-Process "http://127.0.0.1:5173"');
});

test("start.ps1 does not use VS Code embedded browser commands", () => {
  const scriptPath = path.resolve(process.cwd(), "..", "start.ps1");
  const content = fs.readFileSync(scriptPath, "utf8");

  expect(content).not.toMatch(/Simple Browser/i);
  expect(content).not.toMatch(/workbench\.action/i);
  expect(content).not.toMatch(/vscode/i);
});
