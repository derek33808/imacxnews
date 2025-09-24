type ServerEnvOptions = {
  fallback?: string;
  required?: boolean;
};

function readFromImportMeta(name: string): string | undefined {
  try {
    const metaEnv = (import.meta as any)?.env;
    const value = metaEnv?.[name];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  } catch {
    // ignore - import.meta may not be available in some runtimes
  }
  return undefined;
}

function readFromProcessEnv(name: string): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }

  const value = process.env?.[name];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return undefined;
}

export function getServerEnv(name: string, options: ServerEnvOptions = {}): string | undefined {
  const { fallback, required } = options;

  let value = readFromImportMeta(name) ?? readFromProcessEnv(name) ?? fallback;

  if ((value === undefined || value === '') && required) {
    console.error(`❌ Missing required environment variable: ${name}`);
    return undefined;
  }

  return value;
}

export function getRequiredServerEnv(name: string): string {
  const value = getServerEnv(name, { required: true });
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

