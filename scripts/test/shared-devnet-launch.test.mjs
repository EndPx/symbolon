import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const helper = new URL("../verify-shared-devnet.ps1", import.meta.url);
const psQuote = value => `'${value.replaceAll("'", "''")}'`;

test("DevNet helper launches a child from paths with spaces on PowerShell 5.1 and 7; token stays in stdin", {
  skip: process.platform !== "win32",
}, async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "symbolon launch with spaces "));
  try {
    await mkdir(path.join(fixture, "scripts"));
    await mkdir(path.join(fixture, "web/node_modules/tsx/dist"), { recursive: true });
    await copyFile(helper, path.join(fixture, "scripts/verify-shared-devnet.ps1"));
    await writeFile(path.join(fixture, "scripts/shared-devnet.mjs"), "// Isolated fixture; no network execution.\n");
    await writeFile(path.join(fixture, "web/node_modules/tsx/dist/cli.mjs"), `
      import assert from 'node:assert/strict';
      import { writeFileSync } from 'node:fs';
      import path from 'node:path';
      const args = process.argv.slice(2);
      assert.equal(args[0], path.join(process.cwd(), 'scripts/shared-devnet.mjs'));
      assert.equal(args[1], '--auth-stdin');
      assert.deepEqual(args.slice(2), process.env.SYMBOLON_TEST_EXECUTE === '1' ? ['--execute'] : []);
      assert.ok(!process.argv.join(' ').includes('fixture-access-token'));
      let input = ''; for await (const chunk of process.stdin) input += chunk;
      assert.equal(input.trim(), 'fixture-access-token');
      writeFileSync('launch-observation.json', JSON.stringify({ stdinOnly: true, args, cwd: process.cwd() }));
      console.log('Fixture stdout');
      console.error('Fixture stderr token=' + input.trim() + ' Authorization: Bearer other-secret eyJabc.def.ghi');
      process.exitCode = Number(process.env.SYMBOLON_TEST_EXIT || '0');
    `);
    const cases = [
      { shell: "powershell.exe", execute: false, exit: 0 },
      { shell: "powershell.exe", execute: true, exit: 0 },
      { shell: "pwsh.exe", execute: true, exit: 0 },
      { shell: "powershell.exe", execute: true, exit: 7 },
    ];
    for (const item of cases) {
      const command = `
        $ErrorActionPreference = 'Stop'
        function Get-Credential {
          param($UserName, $Message)
          [pscredential]::new('fixture-user', (ConvertTo-SecureString 'fixture-password' -AsPlainText -Force))
        }
        function Invoke-RestMethod {
          param($Method, $Uri, $ContentType, $Body, $ErrorAction)
          if ($Uri -ne 'https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token' -or
              $Body.grant_type -ne 'password' -or $Body.scope -ne 'openid daml_ledger_api') { throw 'Unexpected auth destination or scope' }
          @{ access_token = 'fixture-access-token' }
        }
        & ${psQuote(path.join(fixture, "scripts/verify-shared-devnet.ps1"))} ${item.execute ? "-Execute" : ""}
      `;
      let output = "";
      let failure;
      const childEnv = { ...process.env, SYMBOLON_TEST_EXECUTE: item.execute ? "1" : "0", SYMBOLON_TEST_EXIT: String(item.exit) };
      // Let each host initialize its own modules; a PowerShell 7 parent can
      // otherwise inject Core-only module paths into Windows PowerShell 5.1.
      for (const key of Object.keys(childEnv)) if (key.toLowerCase() === "psmodulepath") delete childEnv[key];
      try {
        output = execFileSync(item.shell, ["-NoProfile", "-NonInteractive", "-Command", command], {
          encoding: "utf8", timeout: 30000,
          env: childEnv,
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) { failure = error; output = String(error.stdout) + String(error.stderr); }
      assert.ok(!output.includes("fixture-access-token"), "token appeared in child/helper output");
      assert.ok(!output.includes("fixture-password"), "password appeared in helper output");
      assert.ok(!output.includes("other-secret"), "bearer token appeared in child/helper output");
      assert.ok(!output.includes("eyJabc.def.ghi"), "JWT appeared in child/helper output");
      assert.match(output, /Fixture stdout/);
      assert.match(output, /Fixture stderr token=\[redacted\]/);
      if (item.exit) {
        assert.ok(failure, "nonzero child exit must stop the helper");
        assert.match(output, /Shared DevNet check incomplete \(exit 7\)/);
      } else { assert.equal(Boolean(failure), false, `${item.shell}: ${output}`); }
      const observation = JSON.parse(await readFile(path.join(fixture, "launch-observation.json"), "utf8"));
      assert.equal(observation.stdinOnly, true);
      assert.equal(observation.cwd, fixture);
      assert.equal(observation.args.includes("--execute"), item.execute);
    }
  } finally {
    assert.ok(path.resolve(fixture).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(fixture, { recursive: true, force: true });
  }
});
