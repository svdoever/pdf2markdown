export async function removePath(path: string): Promise<void> {
    try {
      await Deno.remove(path, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error; // Only re-throw if it's an unexpected error
      }
    }
  }