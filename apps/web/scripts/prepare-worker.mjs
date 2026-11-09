import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const isPrivateSetting = (name) => !name.startsWith('NEXT_PUBLIC_') && /SECRET|PASSWORD|TOKEN|(?:^|_)KEY$/i.test(name);

/** Keep server secrets in Worker bindings, never in the uploaded source bundle. */
export async function prepareWorker(outputDirectory, environmentDirectories = []) {
  const output = resolve(outputDirectory);
  const envModule = join(output, 'cloudflare/next-env.mjs');
  const generated = await import(`${pathToFileURL(envModule).href}?check=${Date.now()}`);
  const knownPrivateValues = new Map();
  const rememberPrivateValues = (values) => {
    for (const [name, value] of Object.entries(values)) {
      if (isPrivateSetting(name) && typeof value === 'string' && value.length >= 8) {
        knownPrivateValues.set(value, name);
      }
    }
  };

  // The adapter compiles every dotenv setting into this module. Public build
  // values may remain; all server-only values must come from runtime bindings.
  const modes = ['production', 'development', 'test'];
  const publicModules = modes.map((mode) => {
    const values = generated[mode];
    if (!values || typeof values !== 'object') throw new Error(`Unexpected OpenNext environment module: ${mode}`);
    rememberPrivateValues(values);
    const publicValues = Object.fromEntries(Object.entries(values).filter(([name]) => name.startsWith('NEXT_PUBLIC_')));
    return `export const ${mode} = ${JSON.stringify(publicValues)};\n`;
  }).join('');
  writeFileSync(envModule, publicModules, { mode: 0o600 });

  // Read private comparison values without logging them. Include process.env for
  // CI and local dotenv files so repeated predeploy scans remain effective after
  // the generated module has already been stripped.
  rememberPrivateValues(process.env);
  for (const directory of environmentDirectories) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      if (!file.isFile() || file.name.endsWith('.example') ||
          !/^(?:\.env(?:\.|$)|\.dev\.vars(?:\.|$))/.test(file.name)) continue;
      rememberPrivateValues(parseEnv(readFileSync(join(directory, file.name), 'utf8')));
    }
  }

  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (entry.isFile()) {
        const bytes = readFileSync(path);
        for (const [value, name] of knownPrivateValues) {
          if (bytes.includes(Buffer.from(value))) {
            // Report only the setting name/path, never the secret or file body.
            throw new Error(`Private setting ${name} found in Worker output ${relative(output, path)}; deployment blocked`);
          }
        }
      }
    }
  }
  scan(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const appDirectory = resolve(import.meta.dirname, '..');
  prepareWorker(join(appDirectory, '.open-next'), [appDirectory, resolve(appDirectory, '../..')])
    .then(() => console.log('Worker prepared: only public dotenv values included; private-secret scan passed.'))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
