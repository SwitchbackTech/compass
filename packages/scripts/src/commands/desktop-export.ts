import { ensureDesktopExportEnv } from "@core/desktop/desktop-export-env";

export async function runDesktopExportCommand(args: string[]): Promise<void> {
  // Bun ignores a TZ assigned at runtime when TZ was absent at startup, so
  // the fixture producers would run in the system zone. Re-exec with TZ set.
  if (process.env["TZ"] !== "UTC") {
    const child = Bun.spawn([process.execPath, ...process.argv.slice(1)], {
      env: { ...process.env, TZ: "UTC" },
      stdio: ["inherit", "inherit", "inherit"],
    });
    process.exit(await child.exited);
  }

  ensureDesktopExportEnv();

  const { runDesktopExport } = await import(
    "@scripts/desktop-export/desktop-export"
  );
  const check = args.includes("--check");
  await runDesktopExport(check);
}
